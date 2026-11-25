import { expect, test } from '@playwright/test';
import { build } from 'vite';

test.beforeEach(async ({ page }) => {
  // Compile the adapter into memory to exercise real browser transactions without
  // exposing test helpers in the application.
  const buildResult = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      lib: { entry: 'tests/fixtures/storage-browser.ts', formats: ['es'] },
    },
  });
  const output = Array.isArray(buildResult) ? buildResult[0] : buildResult;
  if (!output || !('output' in output)) throw new Error('The browser adapter did not compile');
  const module = output.output.find((entry) => entry.type === 'chunk' && entry.isEntry);
  if (!module || module.type !== 'chunk') throw new Error('The browser adapter is missing');

  await page.route('**/storage-test.html', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Storage test</title>' }),
  );
  await page.route('**/storage-test.js', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: module.code }),
  );
  await page.goto('/storage-test.html');
});

test('IndexedDB preserves isolation, backups and revisions through concurrent writes', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/storage-test.js';
    const {
      openCharacterRepository,
      storageCharacter,
    }: typeof import('../fixtures/storage-browser') = await import(modulePath);
    async function errorMessage(work: Promise<unknown>): Promise<string | null> {
      try {
        await work;
        return null;
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        return error.message;
      }
    }

    const character = storageCharacter();
    const firstRepository = await openCharacterRepository();
    const secondRepository = await openCharacterRepository();
    try {
      const initial = await firstRepository.save(character, null);
      const id = character.profile.id;
      const other = await secondRepository.save(
        { ...character, profile: { ...character.profile, id: crypto.randomUUID(), name: 'B' } },
        null,
      );
      const otherId = other.character.profile.id;
      const edited = await firstRepository.save(
        { ...character, profile: { ...character.profile, name: 'A modifié' } },
        initial.revision,
      );
      const selectionAfterEdit = await secondRepository.activeId();
      const staleEdit = await errorMessage(secondRepository.save(character, initial.revision));

      // Reject the current write after the previous snapshot and revision were
      // written, then verify that neither partial write was committed.
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
        if (this.name === 'characters') throw new DOMException('Test quota', 'QuotaExceededError');
        return put.call(this, value, key);
      };
      let quotaError: string | null;
      try {
        quotaError = await errorMessage(firstRepository.save(character, edited.revision, true));
      } finally {
        IDBObjectStore.prototype.put = put;
      }

      const afterFailedWrite = await firstRepository.get(id);
      const selectionAfterFailedWrite = await secondRepository.activeId();
      const restored = await secondRepository.restore(id, edited.revision);
      await firstRepository.select(id);
      await firstRepository.remove(id, restored.revision);
      const afterDeletion = await secondRepository.list();
      const selectionAfterDeletion = await secondRepository.activeId();
      const recreated = await secondRepository.save(character, null);
      const staleAfterRecreation = await errorMessage(
        firstRepository.save(character, restored.revision),
      );

      await secondRepository.select(otherId);
      await secondRepository.save(character, recreated.revision, true);
      const selectionAfterReplacement = await secondRepository.activeId();

      return {
        id,
        otherId,
        selectionAfterFailedWrite,
        selectionAfterReplacement,
        selectionAfterEdit,
        staleEdit,
        quotaError,
        beforeQuotaRevision: edited.revision,
        afterQuotaRevision: afterFailedWrite?.revision,
        afterQuotaName: afterFailedWrite?.character.profile.name,
        restoredName: restored.character.profile.name,
        afterDeletion: afterDeletion.map(({ character }) => character.profile.name),
        selectionAfterDeletion,
        staleAfterRecreation,
        recreatedRevision: recreated.revision,
        restoredRevision: restored.revision,
      };
    } finally {
      firstRepository.close();
      secondRepository.close();
    }
  });

  expect(result.selectionAfterEdit).toBe(result.otherId);
  expect(result.staleEdit).toContain('autre onglet');
  expect(result.quotaError).toContain('saturé');
  expect(result.selectionAfterFailedWrite).toBe(result.otherId);
  expect(result.selectionAfterReplacement).toBe(result.id);
  expect(result.afterQuotaRevision).toBe(result.beforeQuotaRevision);
  expect(result.afterQuotaName).toBe('A modifié');
  expect(result.restoredName).toBe('Personnage fictif');
  expect(result.restoredRevision).toBe(result.beforeQuotaRevision + 1);
  expect(result.afterDeletion).toEqual(['B']);
  expect(result.selectionAfterDeletion).toBe(result.otherId);
  expect(result.staleAfterRecreation).toContain('autre onglet');
  expect(result.recreatedRevision).toBeGreaterThan(result.restoredRevision);
});

test('IndexedDB reports inaccessible storage and preserves newer databases', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/storage-test.js';
    const { openCharacterRepository }: typeof import('../fixtures/storage-browser') = await import(
      modulePath
    );
    async function openError() {
      try {
        const repository = await openCharacterRepository();
        repository.close();
        return null;
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        return error.message;
      }
    }

    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function () {
      throw new DOMException('Test access', 'SecurityError');
    };

    let permissionError: string | null;
    try {
      permissionError = await openError();
    } finally {
      IDBFactory.prototype.open = open;
    }

    function openNewerDatabase() {
      return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('ulnar-rpg', 2);
        request.onupgradeneeded = () => request.result.createObjectStore('v2');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    (await openNewerDatabase()).close();
    const versionError = await openError();
    const database = await openNewerDatabase();
    const newerStorePreserved = database.objectStoreNames.contains('v2');
    database.close();
    return { permissionError, versionError, newerStorePreserved };
  });

  expect(result.permissionError).toContain('inaccessible');
  expect(result.versionError).toContain('version plus récente');
  expect(result.newerStorePreserved).toBe(true);
});
