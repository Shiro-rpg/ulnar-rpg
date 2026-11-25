import { z } from 'zod';

export const stanceSchema = z.enum(['offensive', 'defensive', 'esquive', 'focus']);
export type Stance = z.infer<typeof stanceSchema>;

// Display the descriptions in Informations de base AF28:AJ31 without applying them.
export const STANCES: Record<Stance, { label: string; description: string }> = {
  offensive: {
    label: 'Offensive',
    description: 'Les sorts et attaques infligent toujours les dégâts maximum.',
  },
  defensive: {
    label: 'Défensive',
    description: 'Les jets de dés de défense donnent toujours le résultat maximum + 2 par dé.',
  },
  esquive: {
    label: 'Esquive',
    description:
      'Octroie une esquive sur un sort ou une attaque au choix entre chaque tour de combat.',
  },
  focus: {
    label: 'Focus',
    description:
      'Les jets de combat gagnent un bonus de 10 et -5 / +5 de marge d’échec / succès critique.',
  },
};

export const sessionSchema = z
  .strictObject({
    id: z.uuid(),
    startedAt: z.iso.datetime(),
    currentHp: z.int().nullable(),
    currentMp: z.int().nullable(),
    activeStance: stanceSchema.nullable(),
    turnIndex: z.int().positive(),
    cooldowns: z.array(z.strictObject({ spellId: z.uuid(), remainingTurns: z.int().positive() })),
  })
  .refine(
    ({ cooldowns }) => new Set(cooldowns.map(({ spellId }) => spellId)).size === cooldowns.length,
    { message: 'Un sort ne peut avoir qu’un seul décompte.' },
  );
export type Session = z.infer<typeof sessionSchema>;

function validateSession(value: Session): Session {
  const parsed = sessionSchema.safeParse(value);
  if (!parsed.success) throw new Error('Valeurs de suivi de session invalides.');
  return parsed.data;
}

export function startSession(id: string, startedAt: string): Session {
  return validateSession({
    id,
    startedAt,
    currentHp: null,
    currentMp: null,
    activeStance: null,
    turnIndex: 1,
    cooldowns: [],
  });
}

export function advanceSessionTurn(session: Session): Session {
  return validateSession({ ...session, turnIndex: session.turnIndex + 1 });
}

export function updateSessionResources(
  session: Session,
  currentHp: number | null,
  currentMp: number | null,
): Session {
  return validateSession({ ...session, currentHp, currentMp });
}

export function setSessionStance(session: Session, stance: Stance | null): Session {
  return validateSession({ ...session, activeStance: stance });
}

export function setSpellCooldown(
  session: Session,
  spellId: string,
  remainingTurns: number,
): Session {
  if (!z.uuid().safeParse(spellId).success) throw new Error('Sort invalide.');
  const cooldowns = session.cooldowns.filter((entry) => entry.spellId !== spellId);
  if (remainingTurns !== 0) cooldowns.push({ spellId, remainingTurns });
  return validateSession({ ...session, cooldowns });
}
