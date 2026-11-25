import { describe, expect, it } from 'vitest';
import {
  confirmProfessionExam,
  getProfessionExam,
  recordProfessionRoll,
  type ProfessionProgress,
} from '../../../src/core/game/profession';

const sessionA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const sessionB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const profession: ProfessionProgress = {
  professionId: 'forgeron',
  tier: 2,
  xp: 11,
  lastEligibleRollSessionId: null,
};

describe('confirmed profession progression', () => {
  it.each([
    ['success', 2],
    ['criticalSuccess', 4],
    ['failure', 1],
    ['criticalFailure', 0],
  ] as const)('grants %s XP once per profession and session', (outcome, xp) => {
    const first = recordProfessionRoll(profession, sessionA, outcome);
    expect(first.gainedXp).toBe(xp);
    expect(first.progress).toEqual({
      ...profession,
      xp: 11 + xp,
      lastEligibleRollSessionId: sessionA,
    });
    expect(recordProfessionRoll(first.progress, sessionA, 'success').gainedXp).toBe(0);
    expect(recordProfessionRoll(first.progress, sessionB, 'success').gainedXp).toBe(2);
    expect(
      recordProfessionRoll({ ...profession, professionId: 'alchimiste' }, sessionA, 'success')
        .gainedXp,
    ).toBe(2);
  });

  it('reuses the source thresholds and prices without debiting the wallet', () => {
    expect([1, 2, 3, 4, 5].map((tier) => getProfessionExam(tier))).toEqual([
      { xpRequired: 10, priceGold: 10 },
      { xpRequired: 15, priceGold: 40 },
      { xpRequired: 30, priceGold: 160 },
      { xpRequired: 60, priceGold: 640 },
      { xpRequired: 120, priceGold: 2480 },
    ]);
    expect(getProfessionExam(6)).toBeNull();
    expect(confirmProfessionExam({ ...profession, xp: 17 }, true)).toEqual({
      ...profession,
      xp: 2,
      tier: 3,
    });
  });

  it('requires MJ approval and sufficient XP and keeps the session marker after the exam', () => {
    expect(() => confirmProfessionExam({ ...profession, xp: 17 }, false)).toThrow('accord du MJ');
    expect(() => confirmProfessionExam({ ...profession, xp: 14 }, true)).toThrow('XP');
    const reached = recordProfessionRoll(profession, sessionA, 'criticalSuccess').progress;
    const promoted = confirmProfessionExam(reached, true);
    expect(promoted.xp).toBe(0);
    expect(recordProfessionRoll(promoted, sessionA, 'success').gainedXp).toBe(0);
  });

  it('rejects invalid progression, session identifiers and overflow', () => {
    expect(() => getProfessionExam(0)).toThrow('Palier de métier invalide');
    expect(() => recordProfessionRoll(profession, 'invalid', 'success')).toThrow('Session');
    expect(() =>
      recordProfessionRoll({ ...profession, xp: Number.MAX_SAFE_INTEGER }, sessionA, 'success'),
    ).toThrow('capacité');
    expect(() => confirmProfessionExam({ ...profession, xp: -1 }, true)).toThrow('Progression');
    expect(() => recordProfessionRoll({ ...profession, tier: 7 }, sessionA, 'success')).toThrow(
      'Progression',
    );
  });

  it('blocks XP and progression at tier 6', () => {
    const master = { ...profession, tier: 6 };
    expect(recordProfessionRoll(master, sessionA, 'criticalSuccess')).toEqual({
      progress: master,
      gainedXp: 0,
    });
    expect(() => confirmProfessionExam(master, true)).toThrow('palier maximal');
  });
});
