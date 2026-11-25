import { describe, expect, it } from 'vitest';
import { normalizeBronze, transactMoney } from '../../../src/core/game/wallet';

const empty = { pp: 0, po: 0, pa: 0, pb: 0 };

describe('approved wallet rates', () => {
  it.each([
    [
      { ...empty, pb: 10 },
      { ...empty, pa: 1 },
    ],
    [
      { ...empty, pa: 10 },
      { ...empty, po: 1 },
    ],
    [
      { ...empty, po: 1000 },
      { ...empty, pp: 1 },
    ],
  ])(
    'normalizes each conversion from the official Inventaire I21:I23 rates',
    (change, expected) => {
      expect(normalizeBronze(transactMoney(0, change).totalBronze)).toEqual(expected);
    },
  );

  it('normalizes change after a confirmed signed withdrawal', () => {
    expect(normalizeBronze(transactMoney(100, { ...empty, pb: -1 }).totalBronze)).toEqual({
      pp: 0,
      po: 0,
      pa: 9,
      pb: 9,
    });
  });

  it('rejects a negative final balance and accepts spending the exact balance', () => {
    expect(() => transactMoney(420, { ...empty, pa: -43 })).toThrow('Solde insuffisant');
    expect(transactMoney(420, { ...empty, pa: -42 })).toEqual({
      totalBronze: 0,
      deltaBronze: -420,
    });
  });

  it('rejects unsafe values and retains precision across mixed signed denominations', () => {
    expect(() => normalizeBronze(-1)).toThrow('Solde en bronze invalide');
    expect(() => transactMoney(0, { ...empty, pa: 1.9 })).toThrow('entiers');
    expect(() => transactMoney(Number.MAX_SAFE_INTEGER, { ...empty, pb: 1 })).toThrow('capacité');
    expect(() => transactMoney(0, { ...empty, pp: Number.MAX_SAFE_INTEGER })).toThrow('capacité');
    expect(
      transactMoney(0, { ...empty, pp: 100_000_000_000, po: -100_000_000_000_000, pb: 7 }),
    ).toEqual({ totalBronze: 7, deltaBronze: 7 });
  });
});
