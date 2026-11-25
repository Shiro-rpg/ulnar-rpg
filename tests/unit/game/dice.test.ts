import { describe, expect, it } from 'vitest';
import { diceRollSchema, rollDice } from '../../../src/core/game/dice';

describe('local dice notation', () => {
  it('reports the individual rolls, faces, modifier and total', () => {
    const draws = [0, 5];
    const roll = rollDice(' 2d6 + 2 ', () => draws.shift()!);
    expect(roll).toEqual({ expression: '2D6+2', dice: [1, 6], faces: 6, modifier: 2, total: 9 });
    expect(diceRollSchema.parse(roll)).toEqual(roll);
  });

  it.each([
    ['D100', 99, 100],
    ['D8', 7, 8],
    ['D20-2', 0, -1],
  ])('handles the dice in Informations de base (%s)', (expression, rawDraw, expected) => {
    expect(rollDice(expression, () => rawDraw).total).toBe(expected);
  });

  it('rejects uint32 draws outside the largest multiple of the face count', () => {
    const draws = [0xffffffff, 1];
    expect(rollDice('D6', () => draws.shift()!).dice).toEqual([2]);
    expect(draws).toHaveLength(0);
  });

  it.each([
    '',
    '0D6',
    'D0',
    '101D6',
    'D1001',
    '2D6 + D8',
    '2D6;alert(1)',
    'D6+1.5',
    'D6'.padEnd(49),
  ])('rejects invalid or unsupported notation (%s) before drawing', (expression) => {
    expect(() =>
      rollDice(expression, () => {
        throw new Error('unexpected draw');
      }),
    ).toThrow('Expression de dés');
  });

  it('bounds the production RNG and rejects expressions with an unsafe possible total', () => {
    const roll = rollDice('D100');
    expect(roll.total).toBeGreaterThanOrEqual(1);
    expect(roll.total).toBeLessThanOrEqual(100);
    expect(() => rollDice('D6+9007199254740991')).toThrow('Expression de dés');
  });

  it('rejects contradictory imported history totals and invalid RNG results', () => {
    const roll = rollDice('D6', () => 0);
    expect(diceRollSchema.safeParse({ ...roll, total: 2 }).success).toBe(false);
    expect(diceRollSchema.safeParse({ ...roll, dice: [7], total: 7 }).success).toBe(false);
    expect(() => rollDice('D6', () => -1)).toThrow('aléatoire');
  });
});
