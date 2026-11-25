import { z } from 'zod';

const MAX_DICE = 100;
const MAX_FACES = 1000;
const MAX_EXPRESSION_LENGTH = 48;
const UINT32_RANGE = 2 ** 32;

function parseExpression(input: string) {
  if (input.length > MAX_EXPRESSION_LENGTH) return null;
  const match = /^([0-9]{1,3})?[dD]([0-9]{1,4})(?:\s*([+-])\s*([0-9]{1,16}))?$/.exec(input.trim());
  if (!match) return null;

  const count = Number(match[1] ?? 1);
  const faces = Number(match[2]);
  const modifier = Number(`${match[3] ?? '+'}${match[4] ?? 0}`) || 0;
  if (
    count < 1 ||
    count > MAX_DICE ||
    faces < 1 ||
    faces > MAX_FACES ||
    !Number.isSafeInteger(modifier) ||
    !Number.isSafeInteger(modifier + count * faces)
  ) {
    return null;
  }

  return {
    expression: `${count === 1 ? '' : count}D${faces}${modifier > 0 ? '+' : ''}${modifier || ''}`,
    count,
    faces,
    modifier,
  };
}

export const diceRollSchema = z
  .strictObject({
    expression: z.string().max(MAX_EXPRESSION_LENGTH),
    dice: z.array(z.int().min(1).max(MAX_FACES)).min(1).max(MAX_DICE),
    faces: z.int().min(1).max(MAX_FACES),
    modifier: z.int(),
    total: z.int(),
  })
  .refine(
    ({ expression, dice, faces, modifier, total }) => {
      const parsed = parseExpression(expression);
      return (
        parsed !== null &&
        parsed.count === dice.length &&
        parsed.faces === faces &&
        parsed.modifier === modifier &&
        dice.every((value) => value <= faces) &&
        dice.reduce((sum, value) => sum + value, modifier) === total
      );
    },
    { message: 'Historique de dés incohérent.' },
  );
export type DiceRoll = z.infer<typeof diceRollSchema>;

function secureUint32(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function rollDice(expression: string, drawUint32 = secureUint32): DiceRoll {
  const parsed = parseExpression(expression);
  if (!parsed) {
    throw new Error('Expression de dés invalide. Utilisez par exemple D100, 2D6 ou D20+3.');
  }

  const { count, faces, modifier } = parsed;
  const limit = UINT32_RANGE - (UINT32_RANGE % faces);
  const dice: number[] = [];
  while (dice.length < count) {
    const raw = drawUint32();
    if (!Number.isInteger(raw) || raw < 0 || raw >= UINT32_RANGE) {
      throw new Error('Tirage aléatoire invalide.');
    }
    if (raw < limit) dice.push((raw % faces) + 1);
  }

  return {
    expression: parsed.expression,
    dice,
    faces,
    modifier,
    total: dice.reduce((sum, value) => sum + value, modifier),
  };
}
