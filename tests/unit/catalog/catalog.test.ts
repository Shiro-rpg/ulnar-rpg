import { describe, expect, it } from 'vitest';
import {
  findClass,
  findProfession,
  findRace,
  getCharacterCatalog,
  getOfficialCatalog,
  hasKnownProfileReferences,
  type CharacterCustomCatalog,
} from '../../../src/core/catalog/catalog';
import nysSource from '../../fixtures/catalog/nys-v3.json';

const characterId = '550e8400-e29b-41d4-a716-446655440000';
const otherId = '550e8400-e29b-41d4-a716-446655440001';
const race = nysSource.races.find((entry) => entry.id === 'ulanari')!;
const playerClass = nysSource.classes.find((entry) => entry.id === 'lame-eternelle')!;
const profession = nysSource.professions.find((entry) => entry.id === 'gardienne-des-betes')!;
const extensions: CharacterCustomCatalog = {
  characterId,
  races: [
    {
      id: 'custom:ulanari',
      name: race.name,
      basePv: race.basePv,
      basePp: race.basePp,
      modifiers: race.modifiers,
    },
  ],
  classes: [{ id: 'custom:lame-eternelle', name: playerClass.name }],
  professions: [
    { id: 'custom:gardienne-des-betes', name: profession.name, skills: profession.skills },
  ],
};

const profile = { id: characterId, raceId: 'custom:ulanari', classIds: ['custom:lame-eternelle'] };

describe('Official Ulnar catalog', () => {
  it('uses the blank sheet as the official source', () => {
    const catalog = getOfficialCatalog();
    expect(catalog.rulesVersion).toBe('blank-sheet-v1');
    expect(catalog.races).toHaveLength(11);
    expect(catalog.classes).toHaveLength(21);
    expect(catalog.professions).toHaveLength(18);
  });

  it('has unique identifiers per category', () => {
    const catalog = getOfficialCatalog();
    for (const entries of [catalog.races, catalog.classes, catalog.professions]) {
      expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    }
  });

  it('preserves human modifiers and source blanks', () => {
    expect(findRace(getOfficialCatalog(), 'humain-e')).toMatchObject({
      basePv: 3,
      basePp: 2,
      modifiers: { social: 5, savoir: -1, physique: null },
    });
  });

  it('keeps the official race and class names without aliases', () => {
    const catalog = getOfficialCatalog();
    expect(findRace(catalog, 'naahrul')?.name).toBe("Na'ahrul");
    expect(findRace(catalog, 'ulanari')).toBeUndefined();
    expect(findClass(catalog, 'elementaliste')?.name).toBe('Elementaliste');
    expect(findClass(catalog, 'mage')).toBeUndefined();
  });

  it('keeps official Scribe skills and missing Psychologue skills', () => {
    const catalog = getOfficialCatalog();
    expect(findProfession(catalog, 'scribe')?.skills[4]?.description).toBe(
      'Gagne un bonus de +1 en Savoir',
    );
    expect(
      findProfession(catalog, 'psychologue')?.skills.map((skill) => skill.description),
    ).toEqual([null, null, null, null, null]);
  });

  it('preserves official profession thresholds', () => {
    expect(getOfficialCatalog().professionThresholds.map((entry) => entry.xpRequired)).toEqual([
      10,
      15,
      30,
      60,
      120,
      null,
    ]);
  });

  it('accepts official profile references without extensions', () => {
    expect(
      hasKnownProfileReferences({ id: characterId, raceId: 'humain-e', classIds: ['barde'] }),
    ).toBe(true);
  });
});

describe('Character-owned custom catalog', () => {
  it('adds only the selected custom race, class and profession', () => {
    const catalog = getCharacterCatalog(characterId, extensions);
    expect(catalog.races).toHaveLength(12);
    expect(catalog.classes).toHaveLength(22);
    expect(catalog.professions).toHaveLength(19);
    expect(findRace(catalog, 'custom:ulanari')?.modifiers).toEqual(race.modifiers);
    expect(findClass(catalog, 'custom:lame-eternelle')?.name).toBe('Lame Éternelle');
    expect(findProfession(catalog, 'custom:gardienne-des-betes')?.skills).toEqual(
      profession.skills,
    );
    expect(findProfession(catalog, 'scribe')?.skills[4]?.description).toBe(
      'Gagne un bonus de +1 en Savoir',
    );
  });

  it('resolves custom references only in the selected character catalog', () => {
    expect(hasKnownProfileReferences(profile, extensions)).toBe(true);
    expect(hasKnownProfileReferences(profile)).toBe(false);
    expect(hasKnownProfileReferences({ ...profile, classIds: ['unknown'] }, extensions)).toBe(
      false,
    );
    expect(findRace(getCharacterCatalog(otherId), 'custom:ulanari')).toBeUndefined();
    expect(getOfficialCatalog().races).toHaveLength(11);
  });

  it('rejects extensions owned by another character', () => {
    expect(() => getCharacterCatalog(otherId, extensions)).toThrow('another character');
  });

  it('rejects an attempt to overwrite an official identifier', () => {
    const invalid = { ...extensions, classes: [{ id: 'barde', name: 'Custom Bard' }] };
    expect(() => getCharacterCatalog(characterId, invalid)).toThrow('Invalid custom identifier');
  });

  it('rejects duplicate custom identifiers within a category', () => {
    const invalid = { ...extensions, classes: [...extensions.classes, ...extensions.classes] };
    expect(() => getCharacterCatalog(characterId, invalid)).toThrow('Duplicate custom identifier');
  });

  it('allows a distinct custom variant of an official class', () => {
    const custom = { ...extensions, classes: [{ id: 'custom:barde', name: 'Barde' }] };
    const catalog = getCharacterCatalog(characterId, custom);
    expect(findClass(catalog, 'barde')?.name).toBe('Barde');
    expect(findClass(catalog, 'custom:barde')?.name).toBe('Barde');
  });

  it('rejects noninteger racial bases', () => {
    const invalid = { ...extensions, races: [{ ...extensions.races[0]!, basePv: 1.5 }] };
    expect(() => getCharacterCatalog(characterId, invalid)).toThrow('Invalid racial base');
  });

  it('rejects invalid profession skill tiers', () => {
    const invalid = { ...extensions, professions: [{ ...extensions.professions[0]!, skills: [] }] };
    expect(() => getCharacterCatalog(characterId, invalid)).toThrow('Invalid profession skills');
  });

  it('returns immutable catalog entries and keeps the official thresholds', () => {
    const catalog = getCharacterCatalog(characterId, extensions);
    expect(Object.isFrozen(catalog.races)).toBe(true);
    expect(Object.isFrozen(findRace(catalog, 'custom:ulanari')?.modifiers)).toBe(true);
    expect(Object.isFrozen(findRace(getOfficialCatalog(), 'humain-e'))).toBe(true);
    expect(catalog.professionThresholds).toBe(getOfficialCatalog().professionThresholds);
  });
});
