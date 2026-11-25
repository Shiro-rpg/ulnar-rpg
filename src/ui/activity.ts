import { findProfession, findRace, type RuleCatalog } from '../core/catalog/catalog';
import type { Character } from '../core/character/character';
import { armorDicePool } from '../core/character/collections';
import { calculateStats } from '../core/character/stats';
import { rollDice } from '../core/game/dice';
import {
  confirmProfessionExam,
  getProfessionExam,
  professionOutcomeSchema,
  recordProfessionRoll,
} from '../core/game/profession';
import {
  advanceSessionTurn,
  setSessionStance,
  setSpellCooldown,
  stanceSchema,
  startSession,
  STANCES,
  updateSessionResources,
} from '../core/game/session';
import { type Money, normalizeBronze, transactMoney } from '../core/game/wallet';
import {
  button,
  element,
  field,
  form,
  formValue,
  input,
  numberValue,
  panel,
  select,
} from './controls';

type Run = Parameters<typeof form>[1];
type Save = (character: Character, message?: string) => Promise<void>;

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const currencies = {
  pp: 'Platine (PP)',
  po: 'Or (PO)',
  pa: 'Argent (PA)',
  pb: 'Bronze (PB)',
} as const;
const currencyKeys = ['pp', 'po', 'pa', 'pb'] as const;

function moneyText(amount: Money): string {
  return currencyKeys.map((key) => `${amount[key]} ${key.toUpperCase()}`).join(' · ');
}

export function renderBank(character: Character, run: Run, save: Save): HTMLElement {
  const body = element('div');
  const balance = element('p', moneyText(normalizeBronze(character.totalBronze)), 'balance');
  balance.setAttribute('aria-label', 'Solde actuel');
  const preview = element('div', undefined, 'inline-actions');
  const transfer = form('Vérifier la transaction', run, (data) => {
    const money = Object.fromEntries(
      currencyKeys.map((key) => [key, formValue(data, key) === '' ? 0 : numberValue(data, key)]),
    ) as Money;
    const { totalBronze, deltaBronze } = transactMoney(character.totalBronze, money);
    if (deltaBronze === 0) throw new Error('La transaction doit modifier le solde.');
    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      deltaBronze,
      note: formValue(data, 'note').trim(),
    };
    preview.append(
      element('p', `Nouveau solde prévu, ${moneyText(normalizeBronze(totalBronze))}.`),
      button(
        'Confirmer la transaction',
        () =>
          run(() =>
            save(
              {
                ...character,
                totalBronze,
                transactions: [...character.transactions, entry],
              },
              'Transaction enregistrée.',
            ),
          ),
        'primary',
      ),
      button('Annuler', () => preview.replaceChildren()),
    );
  });
  transfer.addEventListener('input', () => preview.replaceChildren());
  transfer.addEventListener('submit', () => preview.replaceChildren(), { capture: true });
  const grid = element('div', undefined, 'form-grid');
  for (const key of currencyKeys) grid.append(field(currencies[key], input(key, '', 'number')));
  const note = input('note');
  note.maxLength = 200;
  transfer.prepend(grid, field('Note facultative', note));
  body.append(balance, transfer, preview);

  const history = element('ol', undefined, 'history');
  for (const entry of character.transactions.slice().reverse()) {
    const change = `${entry.deltaBronze > 0 ? '+' : ''}${entry.deltaBronze} PB`;
    history.append(
      element(
        'li',
        `${dateFormat.format(new Date(entry.timestamp))} · ${change}${entry.note ? ` · ${entry.note}` : ''}`,
      ),
    );
  }
  body.append(element('h3', 'Transactions'), history);
  if (!character.transactions.length)
    body.append(element('p', 'Aucune transaction enregistrée.', 'muted'));
  return panel('Banque', body, '1 PP = 1 000 PO · 1 PO = 10 PA · 1 PA = 10 PB');
}

const outcomeChoices = [
  { id: 'success', name: 'Réussite' },
  { id: 'criticalSuccess', name: 'Réussite critique' },
  { id: 'failure', name: 'Échec' },
  { id: 'criticalFailure', name: 'Échec critique' },
];

export function renderProfessions(
  character: Character,
  catalog: RuleCatalog,
  run: Run,
  save: Save,
) {
  const content = element('div', undefined, 'panel-grid');
  const session = character.session;
  for (const slot of [0, 1] as const) {
    const title = slot === 0 ? 'Métier principal' : 'Métier secondaire';
    const body = element('div');
    const progress = character.professions[slot];
    function saveProgress(next: Character['professions'][number], message: string) {
      const professions = [...character.professions] as Character['professions'];
      professions[slot] = next;
      return save({ ...character, professions }, message);
    }

    if (
      !progress ||
      (progress.tier === 1 && progress.xp === 0 && !progress.lastEligibleRollSessionId)
    ) {
      const edit = form('Enregistrer le métier', run, (data) => {
        const professionId = formValue(data, 'professionId');
        if (professionId === progress?.professionId) return;
        return saveProgress(
          professionId
            ? {
                professionId,
                tier: 1,
                xp: 0,
                lastEligibleRollSessionId: null,
              }
            : null,
          'Métier enregistré.',
        );
      });
      const otherProfession = character.professions[1 - slot]?.professionId;
      edit.prepend(
        field(
          'Métier',
          select(
            'professionId',
            catalog.professions.filter(({ id }) => id !== otherProfession),
            progress?.professionId,
            'Aucun',
          ),
        ),
      );
      body.append(edit);
    }
    if (progress) {
      const definition = findProfession(catalog, progress.professionId);
      const exam = getProfessionExam(progress.tier);
      body.append(
        element('h3', definition?.name),
        element('p', `Palier ${progress.tier} · ${progress.xp} XP`, 'balance'),
      );
      for (const skill of definition?.skills ?? []) {
        if (skill.tier <= progress.tier && skill.description)
          body.append(element('p', skill.description));
      }
      if (!exam) body.append(element('p', 'Palier maximal atteint.', 'muted'));
      if (session && exam) {
        const consumed = progress.lastEligibleRollSessionId === session.id;
        const outcome = form('Enregistrer le résultat', run, async (data) => {
          const recorded = recordProfessionRoll(
            progress,
            session.id,
            professionOutcomeSchema.parse(formValue(data, 'outcome')),
          );
          await saveProgress(recorded.progress, `Résultat enregistré · ${recorded.gainedXp} XP.`);
        });
        outcome.prepend(field('Résultat du jet', select('outcome', outcomeChoices)));
        body.append(
          element(
            'p',
            consumed
              ? 'Premier jet déjà enregistré pour cette session.'
              : 'Le premier jet de la session peut rapporter de l’XP.',
            'muted',
          ),
          outcome,
        );
      } else if (exam) {
        body.append(
          element(
            'p',
            'Ouvrez une session pour enregistrer le résultat d’un jet de métier.',
            'muted',
          ),
        );
      }
      if (exam) {
        const confirm = form('Confirmer l’examen', run, (data) =>
          saveProgress(
            confirmProfessionExam(progress, data.has('approved')),
            'Palier de métier validé.',
          ),
        );
        const approved = input('approved', 'oui', 'checkbox');
        confirm.prepend(
          element(
            'p',
            `Seuil ${exam.xpRequired} XP · Prix ${exam.priceGold} PO, réglé manuellement.`,
          ),
          field('Le MJ a donné son accord', approved),
        );
        body.append(confirm);
      }
    }
    content.append(panel(title, body));
  }
  return content;
}

export function renderSession(character: Character, catalog: RuleCatalog, run: Run, save: Save) {
  const content = element('div');
  const record = element('div');
  const session = character.session;
  const race = findRace(catalog, character.profile.raceId);
  const stats = race && calculateStats(character.profile.level, race, character.allocation);
  const startLabel = session ? 'Ouvrir une nouvelle session' : 'Ouvrir une session';

  const startButton = button(
    startLabel,
    () =>
      run(() => {
        if (
          session &&
          !window.confirm(
            'Ouvrir une nouvelle session et remplacer le suivi de la session en cours ?',
          )
        )
          return;
        return save(
          {
            ...character,
            session: startSession(crypto.randomUUID(), new Date().toISOString()),
          },
          'Session ouverte.',
        );
      }),
    'primary',
  );
  record.append(startButton);

  if (session) {
    const turn = element(
      'p',
      `Tour ${session.turnIndex} · Session ouverte le ${dateFormat.format(new Date(session.startedAt))}`,
      'balance',
    );
    record.append(
      turn,
      button('Tour suivant', () =>
        run(() => save({ ...character, session: advanceSessionTurn(session) }, 'Tour avancé.')),
      ),
    );

    const resources = form('Enregistrer les ressources', run, (data) => {
      const amount = (name: string) => (formValue(data, name) ? numberValue(data, name) : null);
      return save(
        {
          ...character,
          session: updateSessionResources(session, amount('hp'), amount('mp')),
        },
        'Ressources enregistrées.',
      );
    });
    const grid = element('div', undefined, 'form-grid');
    grid.append(
      field('PV courants', input('hp', session.currentHp ?? '', 'number')),
      field('PM courants', input('mp', session.currentMp ?? '', 'number')),
    );
    resources.prepend(
      grid,
      element(
        'p',
        stats ? `Maximums de la fiche, ${stats.maxHp} PV et ${stats.maxMp} PM.` : undefined,
        'muted',
      ),
    );
    const stance = form('Enregistrer la posture', run, (data) => {
      const selected = formValue(data, 'stance');
      return save(
        {
          ...character,
          session: setSessionStance(session, selected ? stanceSchema.parse(selected) : null),
        },
        'Posture enregistrée.',
      );
    });
    stance.prepend(
      field(
        'Posture',
        select(
          'stance',
          Object.entries(STANCES).map(([id, { label }]) => ({ id, name: label })),
          session.activeStance ?? '',
          'Aucune',
        ),
      ),
    );
    if (session.activeStance) {
      stance.prepend(element('p', STANCES[session.activeStance].description, 'muted'));
    }
    record.append(resources, stance);
    if (character.collections.spells.length) {
      const spells = form('Enregistrer le décompte', run, (data) =>
        save(
          {
            ...character,
            session: setSpellCooldown(
              session,
              formValue(data, 'spellId'),
              numberValue(data, 'turns'),
            ),
          },
          'Temps de recharge enregistré.',
        ),
      );
      const turns = input('turns', 0, 'number');
      turns.min = '0';
      spells.prepend(
        field('Sort suivi', select('spellId', character.collections.spells)),
        field('Tours de recharge restants', turns),
      );
      const list = element('ul', undefined, 'history');
      for (const { spellId, remainingTurns } of session.cooldowns) {
        const spell = character.collections.spells.find(({ id }) => id === spellId);
        list.append(element('li', `${spell?.name} · ${remainingTurns} tour(s)`));
      }
      record.append(spells, list);
    }
  }
  content.append(
    panel(
      'Suivi de session',
      record,
      'Les ressources, postures et temps de recharge sont suivis manuellement. Le passage de tour incrémente le compteur.',
    ),
  );

  const dice = element('div');
  const addRoll = (expression: string, context: string) =>
    save(
      {
        ...character,
        rolls: [
          ...character.rolls,
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            context,
            result: rollDice(expression),
          },
        ],
      },
      'Jet enregistré.',
    );
  const rollForm = form('Lancer les dés', run, (data) =>
    addRoll(formValue(data, 'expression'), formValue(data, 'context').trim()),
  );
  const expression = input('expression', 'D100');
  expression.required = true;
  expression.maxLength = 48;
  const context = input('context');
  context.maxLength = 200;
  rollForm.prepend(field('Expression de dés', expression), field('Contexte facultatif', context));
  const presets = element('div', undefined, 'inline-actions');
  presets.append(
    button('Lancer D100', () => run(() => addRoll('D100', ''))),
    button('Lancer D8', () => run(() => addRoll('D8', ''))),
  );
  const armor = armorDicePool(character.collections);
  if (armor) {
    presets.append(button(`Jet d’armure · ${armor}`, () => run(() => addRoll(armor, 'Armure'))));
  }
  if (stats && Number.isSafeInteger(stats.initiative)) {
    const modifier = stats.initiative;
    presets.append(
      button('Jet d’initiative', () =>
        run(() => addRoll(`D20${modifier >= 0 ? '+' : ''}${modifier}`, 'Initiative')),
      ),
    );
  }
  dice.append(rollForm, presets, element('h3', 'Historique des jets'));
  const history = element('ol', undefined, 'history');
  history.setAttribute('aria-label', 'Historique des jets');
  for (const { timestamp, context: purpose, result } of character.rolls.slice().reverse()) {
    const breakdown = result.dice.join(' + ');
    history.append(
      element(
        'li',
        `${dateFormat.format(new Date(timestamp))} · ${result.expression} = ${result.total} (dés ${breakdown})${purpose ? ` · ${purpose}` : ''}`,
      ),
    );
  }
  dice.append(history);
  if (!character.rolls.length) dice.append(element('p', 'Aucun jet enregistré.', 'muted'));
  content.append(
    panel(
      'Jets de dés',
      dice,
      'Jets locaux, sans certification. Le MJ arbitre les critiques et les effets.',
    ),
  );
  return content;
}
