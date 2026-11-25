import { openDB, type DBSchema, type IDBPTransaction } from 'idb';
import { z } from 'zod';
import { characterSchema, type Character } from '../core/character/character';
import { checkCharacterExportSize } from './transfer';

const DATABASE_NAME = 'ulnar-rpg';
const DATABASE_VERSION = 1;
const STORE_NAMES = ['characters', 'previousSnapshots', 'settings'] as const;
const identifierSchema = z.uuid();
const revisionSchema = z.int().positive();
const snapshotSchema = z.strictObject({ character: characterSchema, revision: revisionSchema });

export type CharacterSnapshot = z.infer<typeof snapshotSchema>;

interface CharacterDatabase extends DBSchema {
  characters: { key: string; value: CharacterSnapshot };
  previousSnapshots: { key: string; value: CharacterSnapshot };
  settings: { key: 'activeCharacterId' | 'lastRevision'; value: string | number };
}

export interface CharacterRepository {
  list(): Promise<CharacterSnapshot[]>;
  get(id: string): Promise<CharacterSnapshot | undefined>;
  activeId(): Promise<string | undefined>;
  select(id: string): Promise<void>;
  save(
    character: Character,
    expectedRevision: number | null,
    selectOnSave?: boolean,
  ): Promise<CharacterSnapshot>;
  remove(id: string, expectedRevision: number): Promise<void>;
  restore(id: string, expectedRevision: number): Promise<CharacterSnapshot>;
  close(): void;
}

type RepositoryTransaction<Mode extends IDBTransactionMode> = IDBPTransaction<
  CharacterDatabase,
  typeof STORE_NAMES,
  Mode
>;

class StorageError extends Error {}

function storageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return new StorageError(
        'Le stockage local est saturé. Votre fiche précédente est conservée.',
        {
          cause: error,
        },
      );
    }
    if (error.name === 'VersionError') {
      return new StorageError('Cette base Ulnar a été créée par une version plus récente.', {
        cause: error,
      });
    }
  }
  return new StorageError(
    'Le stockage local est inaccessible. Vérifiez les autorisations du navigateur et réessayez.',
    { cause: error },
  );
}

function readSnapshot(value: unknown, id: IDBValidKey): CharacterSnapshot | undefined {
  if (value === undefined) return undefined;
  const snapshot = snapshotSchema.safeParse(value);
  if (!snapshot.success || snapshot.data.character.profile.id !== id) {
    throw new StorageError('Une fiche enregistrée est illisible. Aucune donnée n’a été modifiée.');
  }
  return snapshot.data;
}

function expectedSnapshot(
  snapshot: CharacterSnapshot | undefined,
  expectedRevision: number | null,
): void {
  if ((snapshot?.revision ?? null) !== expectedRevision) {
    throw new StorageError(
      'Cette fiche a changé dans un autre onglet. Rechargez-la avant de réessayer.',
    );
  }
}

function requiredSnapshot(snapshot: CharacterSnapshot | undefined): CharacterSnapshot {
  if (!snapshot) throw new StorageError('Cette fiche n’existe plus.');
  return snapshot;
}

// A revision never repeats in this database, even when an imported UUID was deleted first.
async function nextRevision(tx: RepositoryTransaction<'readwrite'>): Promise<number> {
  const settings = tx.objectStore('settings');
  const previous = await settings.get('lastRevision');
  const next = typeof previous === 'number' ? previous + 1 : 1;
  if (
    (previous !== undefined && !revisionSchema.safeParse(previous).success) ||
    !revisionSchema.safeParse(next).success
  ) {
    throw new StorageError('La révision du stockage local est invalide.');
  }
  await settings.put(next, 'lastRevision');
  return next;
}

async function storageOperation<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw storageError(error);
  }
}

export async function openCharacterRepository(): Promise<CharacterRepository> {
  const db = await storageOperation(() =>
    openDB<CharacterDatabase>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database) {
        database.createObjectStore('characters');
        database.createObjectStore('previousSnapshots');
        database.createObjectStore('settings');
      },
      blocking(_currentVersion, _blockedVersion, event) {
        (event.target as IDBDatabase).close();
      },
    }),
  );

  async function transact<T, Mode extends 'readonly' | 'readwrite'>(
    mode: Mode,
    work: (tx: RepositoryTransaction<Mode>) => Promise<T>,
  ): Promise<T> {
    return storageOperation(async () => {
      const tx = db.transaction(STORE_NAMES, mode);
      try {
        const [result] = await Promise.all([work(tx), tx.done]);
        return result;
      } catch (error) {
        try {
          tx.abort();
        } catch {
          // IndexedDB may already have aborted the transaction.
        }
        await tx.done.catch(() => undefined);
        throw error;
      }
    });
  }

  return {
    async list() {
      return transact('readonly', async (tx) => {
        const snapshots: CharacterSnapshot[] = [];
        let cursor = await tx.objectStore('characters').openCursor();
        while (cursor) {
          snapshots.push(requiredSnapshot(readSnapshot(cursor.value, cursor.primaryKey)));
          cursor = await cursor.continue();
        }
        return snapshots;
      });
    },

    async get(id) {
      return transact('readonly', async (tx) =>
        readSnapshot(await tx.objectStore('characters').get(id), id),
      );
    },

    async activeId() {
      return transact('readonly', async (tx) => {
        const id = await tx.objectStore('settings').get('activeCharacterId');
        if (id === undefined) return undefined;
        const validation = identifierSchema.safeParse(id);
        if (!validation.success) throw new StorageError('La sélection enregistrée est illisible.');
        return validation.data;
      });
    },

    async select(id) {
      return transact('readwrite', async (tx) => {
        requiredSnapshot(readSnapshot(await tx.objectStore('characters').get(id), id));
        await tx.objectStore('settings').put(id, 'activeCharacterId');
      });
    },

    async save(character, expectedRevision, selectOnSave = false) {
      const validation = characterSchema.safeParse(character);
      if (!validation.success) {
        throw new StorageError(
          validation.error.issues[0]?.message ?? 'Cette fiche contient des données invalides.',
        );
      }
      checkCharacterExportSize(validation.data);
      const id = validation.data.profile.id;
      return transact('readwrite', async (tx) => {
        const current = tx.objectStore('characters');
        const previous = readSnapshot(await current.get(id), id);
        expectedSnapshot(previous, expectedRevision);

        const snapshot = { character: validation.data, revision: await nextRevision(tx) };
        if (previous) {
          await tx.objectStore('previousSnapshots').put(previous, id);
        }
        if (!previous || selectOnSave) {
          await tx.objectStore('settings').put(id, 'activeCharacterId');
        }
        await current.put(snapshot, id);
        return snapshot;
      });
    },

    async remove(id, expectedRevision) {
      return transact('readwrite', async (tx) => {
        const current = tx.objectStore('characters');
        const snapshot = requiredSnapshot(readSnapshot(await current.get(id), id));
        expectedSnapshot(snapshot, expectedRevision);
        await current.delete(id);
        await tx.objectStore('previousSnapshots').delete(id);

        const settings = tx.objectStore('settings');
        if ((await settings.get('activeCharacterId')) === id) {
          const [next] = await current.getAllKeys(undefined, 1);
          if (next !== undefined) {
            await settings.put(next, 'activeCharacterId');
          } else {
            await settings.delete('activeCharacterId');
          }
        }
      });
    },

    async restore(id, expectedRevision) {
      return transact('readwrite', async (tx) => {
        const current = tx.objectStore('characters');
        const snapshot = requiredSnapshot(readSnapshot(await current.get(id), id));
        expectedSnapshot(snapshot, expectedRevision);
        const previous = tx.objectStore('previousSnapshots');
        const backup = readSnapshot(await previous.get(id), id);
        if (!backup) throw new StorageError('Aucune sauvegarde précédente n’est disponible.');
        const restored = { character: backup.character, revision: await nextRevision(tx) };

        await previous.put(snapshot, id);
        await current.put(restored, id);
        return restored;
      });
    },

    close() {
      db.close();
    },
  };
}
