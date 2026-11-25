import { z } from 'zod';
import { getOfficialCatalog } from '../catalog/catalog';

export const professionProgressSchema = z.strictObject({
  professionId: z.string().trim().min(1),
  tier: z.int().min(1).max(6),
  xp: z.int().nonnegative(),
  lastEligibleRollSessionId: z.uuid().nullable(),
});
export type ProfessionProgress = z.infer<typeof professionProgressSchema>;

export const professionOutcomeSchema = z.enum([
  'criticalSuccess',
  'success',
  'failure',
  'criticalFailure',
]);
export type ProfessionOutcome = z.infer<typeof professionOutcomeSchema>;

const experienceByOutcome: Record<ProfessionOutcome, number> = {
  criticalSuccess: 4,
  success: 2,
  failure: 1,
  criticalFailure: 0,
};

// Métiers AA19:AA23 (official workbook).
const examPrices = [10, 40, 160, 640, 2480];

export function getProfessionExam(tier: number): { xpRequired: number; priceGold: number } | null {
  const threshold = getOfficialCatalog().professionThresholds.find((entry) => entry.tier === tier);
  if (!threshold) throw new Error('Palier de métier invalide.');
  if (threshold.xpRequired === null) return null;
  return { xpRequired: threshold.xpRequired, priceGold: examPrices[tier - 1] };
}

export function recordProfessionRoll(
  progress: ProfessionProgress,
  sessionId: string,
  outcome: ProfessionOutcome,
): { progress: ProfessionProgress; gainedXp: number } {
  if (!professionProgressSchema.safeParse(progress).success) {
    throw new Error('Progression de métier invalide.');
  }
  if (
    !z.uuid().safeParse(sessionId).success ||
    !professionOutcomeSchema.safeParse(outcome).success
  ) {
    throw new Error('Session ou résultat de métier invalide.');
  }
  if (progress.tier === 6 || progress.lastEligibleRollSessionId === sessionId) {
    return { progress, gainedXp: 0 };
  }

  const gainedXp = experienceByOutcome[outcome];
  const xp = progress.xp + gainedXp;
  if (!Number.isSafeInteger(xp)) throw new Error('Le total d’XP dépasse la capacité autorisée.');
  return { progress: { ...progress, xp, lastEligibleRollSessionId: sessionId }, gainedXp };
}

export function confirmProfessionExam(
  progress: ProfessionProgress,
  approved: boolean,
): ProfessionProgress {
  if (!professionProgressSchema.safeParse(progress).success) {
    throw new Error('Progression de métier invalide.');
  }
  const exam = getProfessionExam(progress.tier);
  if (!exam) throw new Error('Le palier maximal est déjà atteint.');
  if (approved !== true) throw new Error('Confirmez l’accord du MJ avant de valider l’examen.');
  if (progress.xp < exam.xpRequired) throw new Error('XP insuffisante pour valider l’examen.');

  return { ...progress, tier: progress.tier + 1, xp: progress.xp - exam.xpRequired };
}
