import { describe, expect, it } from 'vitest';
import { storageCharacter } from '../../fixtures/storage-character';
import {
  copyCharacter,
  decodeCharacter,
  encodeCharacter,
  MAX_IMPORT_BYTES,
} from '../../../src/storage/transfer';

describe('transfert JSON', () => {
  it('préserve les sources et les extensions du personnage', () => {
    const base = storageCharacter();
    const character = {
      ...base,
      profile: { ...base.profile, classIds: ['custom:conteur'] },
      customCatalog: {
        characterId: base.profile.id,
        races: [],
        classes: [{ id: 'custom:conteur', name: 'Conteur' }],
        professions: [],
      },
    };

    const exported = encodeCharacter(character);
    expect(decodeCharacter(exported)).toEqual(character);
    expect(decodeCharacter(String.fromCharCode(0xfeff) + exported)).toEqual(character);
    const copy = copyCharacter(character);
    expect(copy.profile.id).not.toBe(character.profile.id);
    expect(copy.customCatalog?.characterId).toBe(copy.profile.id);
    expect(copy.profile.classIds).toEqual(character.profile.classIds);
    expect(character.customCatalog.characterId).toBe(character.profile.id);
  });

  it('refuse séparément un format ou une version de règles inconnus', () => {
    const exported = JSON.parse(encodeCharacter(storageCharacter()));
    expect(() => decodeCharacter(JSON.stringify({ ...exported, schemaVersion: 2 }))).toThrow(
      'Version du format',
    );
    expect(() =>
      decodeCharacter(JSON.stringify({ ...exported, rulesVersion: 'inconnue' })),
    ).toThrow('Version des règles');
  });

  it('refuse les entrées malformées, volumineuses, trop profondes ou hostiles', () => {
    expect(() => decodeCharacter('{')).toThrow('JSON invalide');
    expect(() => decodeCharacter('é'.repeat(MAX_IMPORT_BYTES / 2 + 1))).toThrow('1 Mio');
    expect(() => decodeCharacter('['.repeat(60) + '0' + ']'.repeat(60))).toThrow('imbriqué');
    expect(() => decodeCharacter('{"character":{"__proto__":{"unsafe":true}}}')).toThrow(
      'clé interdite',
    );
    expect(() => decodeCharacter('{"character":{"constructor":{"prototype":{}}}}')).toThrow(
      'clé interdite',
    );
  });

  it('refuse une référence inconnue et les valeurs dérivées injectées', () => {
    const exported = JSON.parse(encodeCharacter(storageCharacter()));
    expect(() =>
      decodeCharacter(
        JSON.stringify({
          ...exported,
          character: { ...exported.character, maxHp: 99 },
        }),
      ),
    ).toThrow('Fiche invalide');
    expect(() =>
      decodeCharacter(
        JSON.stringify({
          ...exported,
          character: {
            ...exported.character,
            profile: { ...exported.character.profile, raceId: 'custom:absente' },
          },
        }),
      ),
    ).toThrow('Fiche invalide');
  });
});
