import { z } from 'zod';

const name = z.string().trim().min(1).max(160);
const text = z.string().max(500);
const description = z.string().max(8000);
const integer = z.int().nullable();

export const spellSchema = z.strictObject({
  id: z.uuid(),
  name,
  level: integer,
  classId: z.string().trim().min(1).max(160).nullable(),
  category: text,
  description,
  damage: text,
  range: text,
  extraStats: text,
  duration: text,
  manaCost: integer,
  baseCost: integer,
  roll: text,
  cooldown: text,
  creationOrUpgrade: text,
});

export const traitSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    id: z.uuid(),
    kind: z.literal('passive'),
    name,
    origin: text,
    description,
    cost: z.number().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).nullable(),
    acquisition: text,
  }),
  z.strictObject({
    id: z.uuid(),
    kind: z.literal('psychological'),
    name,
    origin: text,
    description,
    flavor: description,
  }),
]);

export const ARMOR_SLOTS = ['helmet', 'chest', 'gloves', 'boots', 'shield'] as const;
export const WEAPON_SLOTS = ['weapon-1', 'weapon-2'] as const;
export const EQUIPMENT_WEIGHTS = ['Léger', 'Intermédiaire', 'Lourd'] as const;

const weight = z.enum(EQUIPMENT_WEIGHTS).nullable();
const tier = z.int().min(1).max(4);

export const equipmentSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    slot: z.enum(ARMOR_SLOTS),
    kind: z.literal('armor'),
    name,
    tier,
    enchantment: text,
    enchantmentTier: tier.nullable(),
    effect: description,
  }),
  z.strictObject({
    slot: z.enum(WEAPON_SLOTS),
    kind: z.literal('weapon'),
    name,
    tier,
    weight,
    damage: text,
    range: text,
    attributes: z.array(z.strictObject({ name: text, effect: description })).max(3),
  }),
]);

export const inventoryItemSchema = z.strictObject({
  id: z.uuid(),
  name,
  category: text,
  quantity: z.int().nonnegative(),
  value: text,
  description,
});

export const characterCollectionsSchema = z
  .strictObject({
    armorWeight: weight,
    spells: z.array(spellSchema).max(500),
    traits: z.array(traitSchema).max(500),
    equipment: z.array(equipmentSchema).max(7),
    inventory: z.array(inventoryItemSchema).max(500),
  })
  .superRefine((collections, context) => {
    const equipmentSlots = collections.equipment.map((entry) => entry.slot);
    if (new Set(equipmentSlots).size !== equipmentSlots.length) {
      context.addIssue({
        code: 'custom',
        path: ['equipment'],
        message: 'Chaque emplacement ne peut recevoir qu’un équipement.',
      });
    }
    for (const group of ['spells', 'traits', 'inventory'] as const) {
      const ids = collections[group].map((entry) => entry.id);
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: 'custom',
          path: [group],
          message: 'Identifiant dupliqué dans la collection.',
        });
      }
    }
  });

export type CharacterCollections = z.infer<typeof characterCollectionsSchema>;
export type Spell = z.infer<typeof spellSchema>;
export type Trait = z.infer<typeof traitSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

export function emptyCharacterCollections(): CharacterCollections {
  return {
    armorWeight: null,
    spells: [],
    traits: [],
    equipment: [],
    inventory: [],
  };
}

const diceFaces = { Léger: 4, Intermédiaire: 6, Lourd: 8 } as const;

/** Équipement!M10, Data automatisation!N29:W31. I4:L8 is a single input. */
export function armorDicePool({
  armorWeight,
  equipment,
}: {
  armorWeight: CharacterCollections['armorWeight'];
  equipment: readonly Equipment[];
}): string | null {
  if (!armorWeight) return null;

  let count = 0;
  for (const entry of equipment) {
    if (entry.kind === 'armor') {
      count += entry.tier;
      if (
        (entry.slot === 'helmet' || entry.slot === 'chest') &&
        entry.enchantment.toLowerCase() === 'protecteur'
      ) {
        count += entry.enchantmentTier ?? 0;
      }
      continue;
    }

    for (const { name } of entry.attributes) {
      switch (name.toLowerCase()) {
        case 'protectrice':
          count += 1;
          break;
        case 'gardienne':
          count += 2;
          break;
        case 'blindé':
          count += entry.tier;
          break;
      }
    }
  }
  return count > 0 ? `${count}D${diceFaces[armorWeight]}` : null;
}
