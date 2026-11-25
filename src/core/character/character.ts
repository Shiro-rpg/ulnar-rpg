import { z } from 'zod';
import {
  ATTRIBUTE_KEYS,
  findClass,
  findProfession,
  findRace,
  getCharacterCatalog,
} from '../catalog/catalog';
import { diceRollSchema } from '../game/dice';
import { professionProgressSchema } from '../game/profession';
import { sessionSchema } from '../game/session';
import { characterCollectionsSchema, emptyCharacterCollections } from './collections';
import { characterProfileSchema, type CharacterProfile } from './profile';
import { allocationSchema, calculateStats, emptyAllocation, remainingTraitPoints } from './stats';

const customEntrySchema = z.strictObject({
  id: z.string().regex(/^custom:[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(160),
});

const customCatalogSchema = z.strictObject({
  characterId: z.uuid(),
  races: z.array(
    customEntrySchema.extend({
      basePv: z.int(),
      basePp: z.int(),
      modifiers: z.record(z.enum(ATTRIBUTE_KEYS), z.int().nullable()),
    }),
  ),
  classes: z.array(customEntrySchema),
  professions: z.array(
    customEntrySchema.extend({
      skills: z
        .array(z.strictObject({ tier: z.int().min(1).max(5), description: z.string().nullable() }))
        .length(5),
    }),
  ),
});

function entriesAreDistinct(ids: readonly string[]): boolean {
  return new Set(ids).size === ids.length;
}

function isSupportedNumber(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
}

export const characterSchema = z
  .strictObject({
    profile: characterProfileSchema,
    inGameSince: z.iso.date().nullable(),
    customCatalog: customCatalogSchema.optional(),
    allocation: allocationSchema,
    collections: characterCollectionsSchema,
    totalBronze: z.int().nonnegative(),
    transactions: z.array(
      z.strictObject({
        id: z.uuid(),
        timestamp: z.iso.datetime(),
        deltaBronze: z.int(),
        note: z.string().max(200),
      }),
    ),
    professions: z.tuple([
      professionProgressSchema.nullable(),
      professionProgressSchema.nullable(),
    ]),
    session: sessionSchema.nullable(),
    rolls: z.array(
      z.strictObject({
        id: z.uuid(),
        timestamp: z.iso.datetime(),
        context: z.string().max(200),
        result: diceRollSchema,
      }),
    ),
  })
  .superRefine((character, ctx) => {
    const issue = (path: string[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    let catalog;
    try {
      catalog = getCharacterCatalog(character.profile.id, character.customCatalog);
    } catch {
      issue(
        ['customCatalog'],
        'Les entrées personnalisées doivent être uniques et appartenir à cette fiche.',
      );
      return;
    }

    const race = findRace(catalog, character.profile.raceId);
    if (!race) {
      issue(['profile', 'raceId'], 'La race sélectionnée est inconnue.');
    } else {
      const { secondary, primary, remaining, maxHp, maxMp, initiative } = calculateStats(
        character.profile.level,
        race,
        character.allocation,
      );
      const computed = [
        ...Object.values(secondary),
        ...Object.values(primary),
        ...Object.values(remaining),
        maxHp,
        maxMp,
        initiative,
      ];
      if (!computed.every(isSupportedNumber)) {
        issue(['allocation'], 'Les caractéristiques dépassent la plage de calcul prise en charge.');
      }
    }
    const costs = character.collections.traits.flatMap((trait) =>
      trait.kind === 'passive' ? [trait.cost] : [],
    );
    if (!isSupportedNumber(remainingTraitPoints(character.profile.level, costs))) {
      issue(
        ['collections', 'traits'],
        'Le budget des traits dépasse la plage de calcul prise en charge.',
      );
    }
    if (
      !entriesAreDistinct(character.profile.classIds) ||
      character.profile.classIds.some((id) => !findClass(catalog, id))
    ) {
      issue(['profile', 'classIds'], 'Choisissez des classes connues et distinctes.');
    }
    const professions = character.professions.flatMap((entry) =>
      entry ? [entry.professionId] : [],
    );
    if (
      !entriesAreDistinct(professions) ||
      professions.some((id) => !findProfession(catalog, id))
    ) {
      issue(['professions'], 'Choisissez des métiers connus et distincts.');
    }
    if (
      character.collections.spells.some(
        (spell) => spell.classId && !findClass(catalog, spell.classId),
      )
    ) {
      issue(['collections', 'spells'], 'Un sort référence une classe inconnue.');
    }
    const spellIds = new Set(character.collections.spells.map((spell) => spell.id));
    if (character.session?.cooldowns.some(({ spellId }) => !spellIds.has(spellId))) {
      issue(
        ['session', 'cooldowns'],
        'Retirez le suivi du temps de recharge avant de supprimer le sort.',
      );
    }
  });

export type Character = z.infer<typeof characterSchema>;

export function createCharacter(profile: CharacterProfile): Character {
  return characterSchema.parse({
    profile,
    inGameSince: null,
    allocation: emptyAllocation(),
    collections: emptyCharacterCollections(),
    totalBronze: 0,
    transactions: [],
    professions: [null, null],
    session: null,
    rolls: [],
  });
}
