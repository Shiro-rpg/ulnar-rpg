import { describe, expect, it } from 'vitest';
import {
  armorDicePool,
  characterCollectionsSchema,
  emptyCharacterCollections,
} from '../../../src/core/character/collections';

const helmet = {
  kind: 'armor',
  slot: 'helmet',
  name: 'Casque fictif',
  tier: 2,
  enchantment: 'Protecteur',
  enchantmentTier: 3,
  effect: '',
} as const;

const weapon = {
  kind: 'weapon',
  slot: 'weapon-1',
  name: 'Arme fictive',
  tier: 2,
  weight: 'Intermédiaire',
  damage: '',
  range: '',
  attributes: [
    { name: 'protectrice', effect: '' },
    { name: 'Gardienne', effect: '' },
    { name: 'Blindé', effect: '' },
  ],
} as const;

describe('character collections', () => {
  it('creates independent, valid empty collections', () => {
    const first = emptyCharacterCollections();
    const second = emptyCharacterCollections();
    expect(characterCollectionsSchema.parse(first)).toEqual(second);
    expect(first.inventory).not.toBe(second.inventory);
    expect(armorDicePool(first)).toBeNull();
  });

  it('accepts numerical or text passive acquisition but keeps psychological text separate', () => {
    const collections = emptyCharacterCollections();
    const passive = {
      id: '4b0692d8-b11f-4d69-b674-2645faaec1d4',
      kind: 'passive',
      name: 'Trait fictif',
      origin: 'Quête',
      description: '',
      cost: null,
      acquisition: 'Offert',
    };
    expect(
      characterCollectionsSchema.safeParse({ ...collections, traits: [passive] }).success,
    ).toBe(true);
    expect(
      characterCollectionsSchema.safeParse({
        ...collections,
        traits: [{ ...passive, cost: 1.25 }],
      }).success,
    ).toBe(true);
    expect(
      characterCollectionsSchema.safeParse({
        ...collections,
        traits: [{ ...passive, kind: 'psychological', flavor: '' }],
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate identifiers and equipment slots', () => {
    const collections = emptyCharacterCollections();
    expect(
      characterCollectionsSchema.safeParse({
        ...collections,
        equipment: [helmet, { ...helmet, name: 'Deuxième casque' }],
      }).success,
    ).toBe(false);
    const item = {
      id: '3b45bf88-c7c7-438e-9582-b3c9569aabba',
      name: 'Objet',
      category: 'Matériaux',
      quantity: 2,
      value: '3 PA',
      description: '',
    };
    expect(
      characterCollectionsSchema.safeParse({
        ...collections,
        inventory: [item, item],
      }).success,
    ).toBe(false);
  });

  it('rejects unknown fields, fractional inventory, and unknown equipment values', () => {
    const collections = emptyCharacterCollections();
    expect(characterCollectionsSchema.safeParse({ ...collections, secret: '' }).success).toBe(
      false,
    );
    expect(
      characterCollectionsSchema.safeParse({
        ...collections,
        inventory: [
          {
            id: '3b45bf88-c7c7-438e-9582-b3c9569aabba',
            name: 'Objet',
            category: 'Matériaux',
            quantity: 0.5,
            value: '',
            description: '',
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      characterCollectionsSchema.safeParse({
        ...collections,
        equipment: [{ ...helmet, tier: 5 }],
      }).success,
    ).toBe(false);
  });
});

describe('armor reserve, Équipement M10 and Data automatisation N29:W31', () => {
  it('counts armor tiers, the two supported enchantment cells, and weapon attributes', () => {
    const equipment = characterCollectionsSchema.parse({
      ...emptyCharacterCollections(),
      armorWeight: 'Lourd',
      equipment: [
        helmet,
        { ...helmet, slot: 'chest', tier: 1, enchantmentTier: 1 },
        weapon,
        { ...weapon, slot: 'weapon-2', tier: 4, attributes: [{ name: 'Blindé', effect: '' }] },
      ],
    });
    expect(armorDicePool(equipment)).toBe('16D8');
  });

  it.each([
    ['Léger', '2D4'],
    ['Intermédiaire', '2D6'],
    ['Lourd', '2D8'],
    [null, null],
  ] as const)('uses the single weight cell %s for the full pool', (armorWeight, expected) => {
    expect(
      armorDicePool({
        armorWeight,
        equipment: [{ ...helmet, enchantment: 'Autre', slot: 'gloves' }],
      }),
    ).toBe(expected);
  });

  it('shows no dice for empty armor and does not invent missing enchantment values', () => {
    expect(armorDicePool({ armorWeight: 'Léger', equipment: [] })).toBeNull();
    expect(
      armorDicePool({
        armorWeight: 'Léger',
        equipment: [{ ...helmet, enchantmentTier: null }],
      }),
    ).toBe('2D4');
  });
});
