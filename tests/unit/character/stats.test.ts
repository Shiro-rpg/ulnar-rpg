import { describe, expect, it } from 'vitest';
import type { RaceDefinition } from '../../../src/core/catalog/catalog';
import {
  allocationSchema,
  calculateStats,
  emptyAllocation,
  remainingTraitPoints,
} from '../../../src/core/character/stats';

const race: RaceDefinition = {
  id: 'fixture',
  name: 'Race fictive',
  basePv: 20,
  basePp: 17,
  modifiers: {
    force: 2,
    finesse: -1,
    charisme: null,
    empathie: 1,
    savoir: null,
    instinct: -2,
    physique: 3,
    social: -5,
    mental: null,
    volonte: 7,
  },
};

describe('caractéristiques de la fiche vierge', () => {
  it('isole les lignes initiales, les gains précoces et les ajustements', () => {
    const input = emptyAllocation();
    input.initial = { force: 4, finesse: 3, charisme: 2, empathie: 1, savoir: 3, instinct: 3 };
    input.early.finesse = 1;
    input.early.charisme = 1;
    input.late.force = 1;
    input.secondaryAdjustments.force = -1;
    input.secondaryAdjustments.savoir = 2;
    input.resourcesAdjustments = {
      hp: 3,
      mp: -2,
      physique: -4,
      social: 6,
      mental: 1,
      volonte: -3,
      initiative: 2,
    };
    input.resources = { hp: 11, mp: 4, volonte: 6, initiative: 5 };

    expect(calculateStats(12, race, input)).toEqual({
      secondary: { force: 6, finesse: 3, charisme: 3, empathie: 2, savoir: 5, instinct: 1 },
      primary: { physique: 79, social: 41, mental: 61, volonte: 50 },
      maxHp: 48,
      maxMp: 31,
      initiative: 14,
      remaining: { initial: 0, early: 1, late: 0, resources: 94 },
    });
  });

  it.each([
    [0, 0, 0],
    [2, 0, 0],
    [3, 1, 0],
    [6, 2, 0],
    [9, 3, 0],
    [10, 3, 0],
    [11, 3, 0],
    [12, 3, 1],
    [15, 3, 2],
    [18, 3, 3],
    [20, 3, 3],
    [21, 3, 3],
  ])('reproduit les budgets de progression au niveau %s', (level, early, late) => {
    expect(calculateStats(level, race, emptyAllocation()).remaining).toEqual({
      initial: 10,
      early,
      late,
      resources: level * 10,
    });
  });

  it('rend visible un dépassement du budget et suit la validation décimale initiale', () => {
    const input = emptyAllocation();
    input.initial.force = 2.5;
    input.early.force = 1;
    expect(allocationSchema.safeParse(input).success).toBe(true);
    expect(calculateStats(1, race, input).remaining).toMatchObject({ initial: 8.5, early: -1 });
    input.initial.force = 4.1;
    expect(allocationSchema.safeParse(input).success).toBe(false);
  });

  it('refuse les allocations négatives et les clés inattendues', () => {
    const input = emptyAllocation();
    expect(
      allocationSchema.safeParse({ ...input, early: { ...input.early, force: -1 } }).success,
    ).toBe(false);
    expect(
      allocationSchema.safeParse({ ...input, resources: { ...input.resources, mental: 1 } })
        .success,
    ).toBe(false);
  });
});

describe('budget de traits passifs', () => {
  it.each([
    [1, 15],
    [10, 60],
    [11, 75],
  ])('applique le seuil du niveau %s', (level, expected) => {
    expect(remainingTraitPoints(level, [])).toBe(expected);
  });

  it('déduit uniquement les coûts numériques, y compris fractionnaires', () => {
    expect(remainingTraitPoints(1, [4.5, null, 2, 0])).toBe(8.5);
    expect(remainingTraitPoints(1, [20])).toBe(-5);
  });
});
