import { z } from 'zod';

export const moneySchema = z.strictObject({
  pp: z.int(),
  po: z.int(),
  pa: z.int(),
  pb: z.int(),
});
export type Money = z.infer<typeof moneySchema>;

const PP_IN_BRONZE = 100_000;
const PO_IN_BRONZE = 100;
const PA_IN_BRONZE = 10;
const MAXIMUM_BALANCE = BigInt(Number.MAX_SAFE_INTEGER);

function assertBalance(totalBronze: number): void {
  if (!Number.isSafeInteger(totalBronze) || totalBronze < 0) {
    throw new Error('Solde en bronze invalide.');
  }
}

export function normalizeBronze(totalBronze: number): Money {
  assertBalance(totalBronze);

  return {
    pp: Math.floor(totalBronze / PP_IN_BRONZE),
    po: Math.floor((totalBronze % PP_IN_BRONZE) / PO_IN_BRONZE),
    pa: Math.floor((totalBronze % PO_IN_BRONZE) / PA_IN_BRONZE),
    pb: totalBronze % PA_IN_BRONZE,
  };
}

export function transactMoney(
  totalBronze: number,
  change: Money,
): { totalBronze: number; deltaBronze: number } {
  assertBalance(totalBronze);
  const parsed = moneySchema.safeParse(change);
  if (!parsed.success) throw new Error('Les montants doivent être des nombres entiers sûrs.');

  const { pp, po, pa, pb } = parsed.data;
  const delta =
    BigInt(pp) * BigInt(PP_IN_BRONZE) +
    BigInt(po) * BigInt(PO_IN_BRONZE) +
    BigInt(pa) * BigInt(PA_IN_BRONZE) +
    BigInt(pb);
  const next = BigInt(totalBronze) + delta;
  if (next < 0n) throw new Error('Solde insuffisant.');
  if (next > MAXIMUM_BALANCE) {
    throw new Error('Le montant dépasse la capacité du portefeuille.');
  }
  return { totalBronze: Number(next), deltaBronze: Number(delta) };
}
