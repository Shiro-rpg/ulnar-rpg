import { z } from 'zod';
import type { RaceDefinition } from '../catalog/catalog';

export const SECONDARY_ATTRIBUTES = [
  'force',
  'finesse',
  'charisme',
  'empathie',
  'savoir',
  'instinct',
] as const;
export const PRIMARY_ATTRIBUTES = ['physique', 'social', 'mental', 'volonte'] as const;
export const RESOURCE_KEYS = ['hp', 'mp', 'volonte', 'initiative'] as const;
export const RESOURCE_ADJUSTMENT_KEYS = ['hp', 'mp', ...PRIMARY_ATTRIBUTES, 'initiative'] as const;

const adjustment = z.number().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const points = adjustment.nonnegative();
const secondaryAttribute = z.enum(SECONDARY_ATTRIBUTES);

export const allocationSchema = z.strictObject({
  initial: z.record(secondaryAttribute, z.number().min(1).max(4)),
  early: z.record(secondaryAttribute, points),
  secondaryAdjustments: z.record(secondaryAttribute, adjustment),
  late: z.record(secondaryAttribute, points),
  resourcesAdjustments: z.record(z.enum(RESOURCE_ADJUSTMENT_KEYS), adjustment),
  resources: z.record(z.enum(RESOURCE_KEYS), points),
});

export type Allocation = z.infer<typeof allocationSchema>;

function secondaryWith(value: number): Allocation['initial'] {
  return {
    force: value,
    finesse: value,
    charisme: value,
    empathie: value,
    savoir: value,
    instinct: value,
  };
}

export function emptyAllocation(): Allocation {
  return {
    initial: secondaryWith(1),
    early: secondaryWith(0),
    secondaryAdjustments: secondaryWith(0),
    late: secondaryWith(0),
    resourcesAdjustments: {
      hp: 0,
      mp: 0,
      physique: 0,
      social: 0,
      mental: 0,
      volonte: 0,
      initiative: 0,
    },
    resources: { hp: 0, mp: 0, volonte: 0, initiative: 0 },
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function calculateStats(level: number, race: RaceDefinition, allocation: Allocation) {
  const { initial, early, late, secondaryAdjustments, resourcesAdjustments, resources } =
    allocation;
  const secondary = secondaryWith(0);
  const beforeRacialBonus = secondaryWith(0);
  const racial = (key: keyof RaceDefinition['modifiers']) => race.modifiers[key] ?? 0;

  for (const key of SECONDARY_ATTRIBUTES) {
    beforeRacialBonus[key] = initial[key] + early[key];
    secondary[key] = beforeRacialBonus[key] + racial(key) + secondaryAdjustments[key] + late[key];
  }

  const { force, finesse, charisme, empathie, savoir, instinct } = beforeRacialBonus;

  // Informations de base, H41:Z41 et H48:Z48. Les PV/PM lisent la seule ligne
  // initiale. Les autres bases lisent la ligne 31, où les bonus et gains tardifs
  // ne figurent pas. Les cellules N48/Q48/T48 n'incluent pas la ligne 47.
  const primary = {
    physique: (force + finesse) * 10 + racial('physique') + resourcesAdjustments.physique,
    social: (charisme + empathie) * 10 + racial('social') + resourcesAdjustments.social,
    mental: (savoir + instinct) * 10 + racial('mental') + resourcesAdjustments.mental,
    volonte:
      (force + empathie + savoir) * 5 +
      racial('volonte') +
      resourcesAdjustments.volonte +
      resources.volonte,
  };

  return {
    secondary,
    primary,
    maxHp:
      race.basePv + (initial.force + initial.finesse) * 2 + resourcesAdjustments.hp + resources.hp,
    maxMp:
      race.basePp +
      (initial.savoir + initial.instinct) * 2 +
      resourcesAdjustments.mp +
      resources.mp,
    initiative:
      finesse +
      charisme +
      instinct +
      resourcesAdjustments.initiative +
      Math.floor(resources.initiative / 2),
    remaining: {
      initial: 16 - sum(Object.values(initial)),
      early: Math.trunc(Math.min(level, 10) / 3) - sum(Object.values(early)),
      late:
        (level > 20 ? 3 : level >= 11 ? Math.trunc((level - 9) / 3) : 0) - sum(Object.values(late)),
      resources: level * 10 - sum(Object.values(resources)),
    },
  };
}

export function remainingTraitPoints(level: number, costs: readonly (number | null)[]): number {
  // Sorts et Traits!AF23. SUM ignore les cellules vides ou textuelles.
  const spent = costs.reduce<number>((total, cost) => total + (cost ?? 0), 0);
  return 10 + level * 5 + (level >= 11 ? 10 : 0) - spent;
}
