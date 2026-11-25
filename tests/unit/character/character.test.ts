import { describe, expect, it } from 'vitest';
import { characterSchema, createCharacter } from '../../../src/core/character/character';
import { getOfficialCatalog } from '../../../src/core/catalog/catalog';

const catalog = getOfficialCatalog();
const profile = {
  id: 'cf1c161d-be14-43ab-a452-971bcab91f11',
  name: 'Personnage fictif',
  raceId: catalog.races[0].id,
  classIds: [catalog.classes[0].id],
  level: 1,
  gender: '',
  age: '',
  affiliations: '',
  deity: '',
  campaignLabel: '',
  lore: '',
};

describe('instantané de personnage', () => {
  it('initialise des données sources indépendantes et sans session ouverte', () => {
    const first = createCharacter(profile);
    const second = createCharacter(profile);
    expect(first).toEqual(second);
    expect(first.allocation).not.toBe(second.allocation);
    expect(first.professions).toEqual([null, null]);
    expect(first.session).toBeNull();
    expect(first.totalBronze).toBe(0);
  });

  it('refuse une race inconnue, une extension étrangère et un champ dérivé injecté', () => {
    const character = createCharacter(profile);
    expect(
      characterSchema.safeParse({
        ...character,
        profile: { ...profile, raceId: 'custom:inconnue' },
      }).success,
    ).toBe(false);
    expect(
      characterSchema.safeParse({
        ...character,
        customCatalog: {
          characterId: '8febee02-be29-424d-8abf-f177fb523fc0',
          races: [],
          classes: [],
          professions: [],
        },
      }).success,
    ).toBe(false);
    expect(characterSchema.safeParse({ ...character, maxHp: 99 }).success).toBe(false);
  });

  it('accepte une classe détenue par le personnage', () => {
    const character = createCharacter(profile);
    expect(
      characterSchema.safeParse({
        ...character,
        profile: { ...profile, classIds: ['custom:conteur'] },
        customCatalog: {
          characterId: profile.id,
          races: [],
          classes: [{ id: 'custom:conteur', name: 'Conteur' }],
          professions: [],
        },
      }).success,
    ).toBe(true);
  });

  it('refuse une référence de métier inconnue ou dupliquée', () => {
    const character = createCharacter(profile);
    const progression = {
      professionId: catalog.professions[0].id,
      tier: 1,
      xp: 0,
      lastEligibleRollSessionId: null,
    };
    expect(
      characterSchema.safeParse({ ...character, professions: [progression, progression] }).success,
    ).toBe(false);
    expect(
      characterSchema.safeParse({
        ...character,
        professions: [{ ...progression, professionId: 'custom:inconnu' }, null],
      }).success,
    ).toBe(false);
  });
});

it('refuse un calcul qui dépasse la plage numérique prise en charge', () => {
  const character = createCharacter(profile);
  expect(
    characterSchema.safeParse({
      ...character,
      profile: { ...profile, level: Number.MAX_SAFE_INTEGER },
    }).success,
  ).toBe(false);
});

it('refuse une recharge attachée à un sort inconnu', () => {
  const character = createCharacter(profile);
  expect(
    characterSchema.safeParse({
      ...character,
      session: {
        id: '1124fab4-e13b-42d0-b007-aeafe3247ed6',
        startedAt: '2026-01-01T00:00:00.000Z',
        currentHp: null,
        currentMp: null,
        activeStance: null,
        turnIndex: 1,
        cooldowns: [{ spellId: 'e8afbdef-fbd5-4810-92c1-c644cdc40b62', remainingTurns: 2 }],
      },
    }).error?.issues[0]?.path,
  ).toEqual(['session', 'cooldowns']);
});
