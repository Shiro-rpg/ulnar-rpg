import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Character } from '../../src/core/character/character';

async function createAdventurer(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nouveau personnage' }).click();
  const form = page.getByRole('form', { name: 'Nouveau personnage' });
  await form.getByLabel('Nom', { exact: true }).fill('Aventurière fictive');
  await form.getByRole('button', { name: 'Créer la fiche' }).click();
  await expect(
    page.getByRole('heading', { name: 'Aventurière fictive', exact: true }),
  ).toBeVisible();
}

async function exportState(page: Page): Promise<Character> {
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter la fiche' }).click();
  const download = await downloadEvent;
  const exported: { character: Character } = JSON.parse(
    await readFile(await download.path(), 'utf8'),
  );
  return exported.character;
}

function professionPanel(page: Page, heading: string) {
  return page.getByRole('heading', { name: heading, exact: true }).locator('xpath=..');
}

async function recordOutcome(panel: Locator, outcome: string) {
  await panel.getByRole('combobox', { name: 'Résultat du jet', exact: true }).selectOption(outcome);
  await panel.getByRole('button', { name: 'Enregistrer le résultat', exact: true }).click();
}

test('garde le premier jet de chaque métier, y compris un échec critique, après rechargement', async ({
  page,
}) => {
  await createAdventurer(page);
  await page.getByRole('button', { name: 'Session', exact: true }).click();
  await page.getByRole('button', { name: 'Ouvrir une session', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tour suivant', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Métiers', exact: true }).click();
  const primary = professionPanel(page, 'Métier principal');
  const secondary = professionPanel(page, 'Métier secondaire');
  await primary.getByRole('combobox', { name: 'Métier', exact: true }).selectOption('forgeron');
  await primary.getByRole('button', { name: 'Enregistrer le métier', exact: true }).click();
  await expect(primary.getByText('Palier 1 · 0 XP')).toBeVisible();
  await secondary.getByRole('combobox', { name: 'Métier', exact: true }).selectOption('alchimiste');
  await secondary.getByRole('button', { name: 'Enregistrer le métier', exact: true }).click();
  await expect(secondary.getByText('Palier 1 · 0 XP')).toBeVisible();

  await recordOutcome(primary, 'criticalFailure');
  await expect(primary.getByText('Premier jet déjà enregistré pour cette session.')).toBeVisible();
  await recordOutcome(secondary, 'success');
  await expect(secondary.getByText('Palier 1 · 2 XP')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Métiers', exact: true }).click();
  await recordOutcome(primary, 'criticalSuccess');
  await expect(page.getByRole('status')).toContainText('Résultat enregistré · 0 XP.');
  await recordOutcome(secondary, 'criticalSuccess');
  await expect(page.getByRole('status')).toContainText('Résultat enregistré · 0 XP.');
  const prior = await exportState(page);
  expect(prior.session?.id).toBeTruthy();
  expect(prior.professions).toMatchObject([
    { professionId: 'forgeron', xp: 0, lastEligibleRollSessionId: prior.session?.id },
    { professionId: 'alchimiste', xp: 2, lastEligibleRollSessionId: prior.session?.id },
  ]);

  await page.getByRole('button', { name: 'Session', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Ouvrir une nouvelle session', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Session ouverte.');
  await page.getByRole('button', { name: 'Métiers', exact: true }).click();
  await recordOutcome(primary, 'success');
  await expect(primary.getByText('Palier 1 · 2 XP')).toBeVisible();
  const next = await exportState(page);
  expect(next.session?.id).not.toBe(prior.session?.id);
  expect(next.professions).toMatchObject([
    { professionId: 'forgeron', xp: 2, lastEligibleRollSessionId: next.session?.id },
    { professionId: 'alchimiste', xp: 2, lastEligibleRollSessionId: prior.session?.id },
  ]);
});

test('persiste les ressources manuelles, le tour et un jet détaillé valide', async ({ page }) => {
  await createAdventurer(page);
  await page.getByRole('button', { name: 'Session', exact: true }).click();
  await page.getByRole('button', { name: 'Ouvrir une session', exact: true }).click();
  await page.getByLabel('PV courants', { exact: true }).fill('13');
  await page.getByLabel('PM courants', { exact: true }).fill('11');
  await page.getByRole('button', { name: 'Enregistrer les ressources', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Ressources enregistrées.');
  await page.getByRole('button', { name: 'Tour suivant', exact: true }).click();
  await expect(page.getByText(/^Tour 2 ·/)).toBeVisible();
  await page.getByLabel('Expression de dés', { exact: true }).fill('2D6+1');
  await page.getByRole('button', { name: 'Lancer les dés', exact: true }).click();
  const history = page.getByRole('list', { name: 'Historique des jets' });
  await expect(history).toContainText('2D6+1');
  await page.getByLabel('Expression de dés', { exact: true }).fill('2D6+alert(1)');
  await page.getByRole('button', { name: 'Lancer les dés', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Expression de dés invalide');
  await expect(history.getByRole('listitem')).toHaveCount(1);

  await page.reload();
  await page.getByRole('button', { name: 'Session', exact: true }).click();
  await expect(page.getByLabel('PV courants', { exact: true })).toHaveValue('13');
  await expect(page.getByLabel('PM courants', { exact: true })).toHaveValue('11');
  const state = await exportState(page);
  expect(state.session).toMatchObject({ currentHp: 13, currentMp: 11, turnIndex: 2 });
  expect(state.rolls).toHaveLength(1);
  const roll = state.rolls[0].result;
  expect(roll).toMatchObject({ expression: '2D6+1', faces: 6, modifier: 1 });
  expect(roll.dice).toHaveLength(2);
  for (const value of roll.dice) {
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(6);
  }
  expect(roll.total).toBe(roll.dice[0] + roll.dice[1] + 1);
});
