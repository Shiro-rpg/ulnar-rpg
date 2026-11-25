import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function createCharacter(page: Page, name: string) {
  await page.getByRole('button', { name: 'Nouveau personnage' }).click();
  const form = page.getByRole('form', { name: 'Nouveau personnage' });
  await form.getByLabel('Nom', { exact: true }).fill(name);
  await form.getByRole('button', { name: 'Créer la fiche' }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

test('isole les fiches et le solde, conserve la sélection et refuse une dette', async ({
  page,
}) => {
  await page.goto('/');
  await createCharacter(page, 'Éclaireuse fictive');
  await page.getByRole('button', { name: 'Inventaire et banque' }).click();
  await page.getByLabel('Or (PO)').fill('1');
  await page.getByRole('button', { name: 'Vérifier la transaction' }).click();
  await page.getByRole('button', { name: 'Confirmer la transaction' }).click();
  await expect(page.getByLabel('Solde actuel')).toContainText('1 PO');

  await page.getByLabel('Or (PO)').fill('-2');
  await page.getByRole('button', { name: 'Vérifier la transaction' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Solde actuel')).toContainText('1 PO');

  await createCharacter(page, 'Second personnage fictif');
  await page.getByRole('button', { name: 'Inventaire et banque' }).click();
  await expect(page.getByLabel('Solde actuel')).toContainText('0 PO');
  await page.getByLabel('Personnage actif').selectOption({ label: 'Éclaireuse fictive' });
  await expect(
    page.getByRole('heading', { name: 'Éclaireuse fictive', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Éclaireuse fictive', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Inventaire et banque' }).click();
  await expect(page.getByLabel('Solde actuel')).toContainText('1 PO');
});

test('exporte, refuse un fichier invalide et crée une copie sur confirmation', async ({ page }) => {
  await page.goto('/');
  await createCharacter(page, 'Archiviste fictif');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter la fiche' }).click();
  const download = await downloadEvent;
  const path = await download.path();

  const input = page.getByLabel('Fichier JSON');
  await input.setInputFiles({
    name: 'invalide.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":999}'),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Archiviste fictif', exact: true })).toBeVisible();

  await input.setInputFiles(path);
  await expect(page.getByRole('heading', { name: 'Aperçu de l’import' })).toBeVisible();
  const selected = page.getByLabel('Personnage actif');
  const originalId = await selected.inputValue();
  await page.getByRole('button', { name: 'Importer une copie' }).click();
  await expect(
    selected.getByRole('option', { name: 'Archiviste fictif', exact: true }),
  ).toHaveCount(2);
  await expect(selected).not.toHaveValue(originalId);
});

test('la fiche reste utilisable à 360 px et affiche le texte saisi littéralement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await createCharacter(page, '<em>Nom littéral</em>');
  await expect(
    page.getByRole('heading', { name: '<em>Nom littéral</em>', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('recalcule les ressources à partir des allocations et conserve les valeurs sources', async ({
  page,
}) => {
  await page.goto('/');
  await createCharacter(page, 'Sentinelle fictive');
  await page.getByRole('button', { name: 'Caractéristiques' }).click();
  const initial = page.getByRole('group', { name: 'Valeurs initiales' });
  const maxHp = page.getByRole('term').filter({ hasText: 'PV maximum' });
  const value = maxHp.locator('+ dd');
  const before = Number((await value.textContent())?.replace(/\s/g, ''));
  await initial.getByLabel('Force').fill('3');
  await page.getByRole('button', { name: 'Enregistrer les allocations' }).click();
  await expect(value).toHaveText(String(before + 4));
  await page.reload();
  await page.getByRole('button', { name: 'Caractéristiques' }).click();
  await expect(initial.getByLabel('Force')).toHaveValue('3');
  await expect(value).toHaveText(String(before + 4));
});

test('les modifications de la fiche restent locales au navigateur', async ({ page }) => {
  await page.goto('/');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await createCharacter(page, 'Personnage local fictif');
  await page.getByRole('button', { name: 'Session' }).click();
  await page.getByRole('button', { name: 'Lancer D8' }).click();
  await expect(page.getByLabel('Historique des jets').getByRole('listitem')).toHaveCount(1);
  expect(requests).toEqual([]);
});

test('garde les extensions de catalogue dans leur fiche', async ({ page }) => {
  await page.goto('/');
  await createCharacter(page, 'Personnage propriétaire fictif');
  await page.getByText('Ajouter une entrée personnalisée').click();
  await page.getByLabel('Nom personnalisé').fill('Archiviste du nord');
  await page.getByRole('button', { name: 'Ajouter au catalogue de cette fiche' }).click();
  const classes = page.getByLabel('Classe principale');
  await expect(classes.getByRole('option', { name: 'Archiviste du nord' })).toHaveCount(1);
  await classes.selectOption({ label: 'Archiviste du nord' });
  await page.getByRole('button', { name: 'Enregistrer le profil' }).click();
  await expect(page.getByRole('status')).toHaveText('Profil enregistré.');

  await createCharacter(page, 'Personnage indépendant fictif');
  await expect(classes.getByRole('option', { name: 'Archiviste du nord' })).toHaveCount(0);
  await page
    .getByLabel('Personnage actif')
    .selectOption({ label: 'Personnage propriétaire fictif' });
  await expect(classes.locator('option:checked')).toHaveText('Archiviste du nord');
});

test('l’aperçu de production ne sert aucune source privée', async ({ request }) => {
  for (const path of [
    '/docs/references/Fiche%20Vierge(1).xlsx',
    '/docs/references/Nys%20V3.xlsx',
    '/tests/fixtures/catalog/nys-v3.json',
  ]) {
    const response = await request.get(path, { headers: { Accept: 'application/octet-stream' } });
    expect(response.status()).toBe(404);
  }
});
