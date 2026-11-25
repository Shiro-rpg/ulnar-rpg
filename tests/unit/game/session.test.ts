import { describe, expect, it } from 'vitest';
import {
  advanceSessionTurn,
  sessionSchema,
  setSessionStance,
  setSpellCooldown,
  startSession,
  updateSessionResources,
} from '../../../src/core/game/session';

const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const spellId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const startedAt = '2026-11-25T12:00:00.000Z';

describe('manual session tracking', () => {
  it('starts explicitly without deriving current resources from character maxima', () => {
    expect(startSession(sessionId, startedAt)).toEqual({
      id: sessionId,
      startedAt,
      currentHp: null,
      currentMp: null,
      activeStance: null,
      turnIndex: 1,
      cooldowns: [],
    });
  });

  it('treats resources, stance, and turn as independently recorded values', () => {
    const session = startSession(sessionId, startedAt);
    const staged = setSpellCooldown(
      setSessionStance(updateSessionResources(session, -3, 80), 'focus'),
      spellId,
      3,
    );
    expect(advanceSessionTurn(staged)).toEqual({
      ...staged,
      turnIndex: 2,
      currentHp: -3,
      currentMp: 80,
      activeStance: 'focus',
      cooldowns: [{ spellId, remainingTurns: 3 }],
    });
    expect(session.currentHp).toBeNull();
    expect(setSpellCooldown(staged, spellId, 0).cooldowns).toEqual([]);
  });

  it('rejects duplicate cooldowns and malformed tracking values', () => {
    const session = startSession(sessionId, startedAt);
    expect(() => setSpellCooldown(session, spellId, -1)).toThrow();
    expect(() => setSpellCooldown(session, 'invalid', 0)).toThrow('Sort invalide');
    expect(() => advanceSessionTurn({ ...session, turnIndex: Number.MAX_SAFE_INTEGER })).toThrow(
      'suivi de session invalides',
    );
    expect(() => updateSessionResources(session, 1.5, null)).toThrow();
    const cooldown = { spellId, remainingTurns: 1 };
    expect(sessionSchema.safeParse({ ...session, cooldowns: [cooldown, cooldown] }).success).toBe(
      false,
    );
  });
});
