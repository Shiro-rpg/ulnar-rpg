import { z } from 'zod';
import { OFFICIAL_RULES_VERSION } from '../core/catalog/catalog';
import { characterSchema, type Character } from '../core/character/character';

export const MAX_IMPORT_BYTES = 1_048_576;
const SCHEMA_VERSION = 1;
const MAX_JSON_DEPTH = 32;
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const envelopeSchema = z.strictObject({
  schemaVersion: z.int(),
  rulesVersion: z.string(),
  exportedAt: z.iso.datetime(),
  character: z.unknown(),
});

function checkSize(text: string): void {
  if (text.length > MAX_IMPORT_BYTES || new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) {
    throw new Error('La fiche dépasse la limite de 1 Mio.');
  }
}

function inspectJson(value: unknown, depth = 0): void {
  if (typeof value !== 'object' || value === null) return;
  if (depth >= MAX_JSON_DEPTH) throw new Error('Le JSON est trop profondément imbriqué.');

  for (const [key, child] of Object.entries(value)) {
    if (RESERVED_KEYS.has(key)) throw new Error('Le JSON contient une clé interdite.');
    inspectJson(child, depth + 1);
  }
}

function validatedCharacter(input: unknown): Character {
  const validation = characterSchema.safeParse(input);
  if (validation.success) return validation.data;
  const path = validation.error.issues[0]?.path.join('.');
  throw new Error(path ? `Fiche invalide au champ « ${path} ».` : 'Fiche invalide.');
}

function formatCharacter(character: Character): string {
  const text = JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      rulesVersion: OFFICIAL_RULES_VERSION,
      exportedAt: new Date().toISOString(),
      character,
    },
    null,
    2,
  );
  checkSize(text);
  return text;
}

export function encodeCharacter(character: Character): string {
  return formatCharacter(validatedCharacter(character));
}

export function checkCharacterExportSize(character: Character): void {
  formatCharacter(character);
}

export function decodeCharacter(text: string): Character {
  checkSize(text);
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('JSON invalide.');
  }

  inspectJson(raw);
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) throw new Error('Structure de fichier Ulnar invalide.');
  if (envelope.data.schemaVersion !== SCHEMA_VERSION) {
    throw new Error('Version du format JSON non prise en charge.');
  }
  if (envelope.data.rulesVersion !== OFFICIAL_RULES_VERSION) {
    throw new Error('Version des règles du fichier non prise en charge.');
  }
  return validatedCharacter(envelope.data.character);
}

export function copyCharacter(character: Character): Character {
  const id = crypto.randomUUID();
  return validatedCharacter({
    ...character,
    profile: { ...character.profile, id },
    ...(character.customCatalog && {
      customCatalog: { ...character.customCatalog, characterId: id },
    }),
  });
}
