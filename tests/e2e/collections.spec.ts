import { expect, test } from '@playwright/test';

test('édite les collections d’une fiche et retrouve les données après rechargement', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nouveau personnage', exact: true }).click();
  const creation = page.getByRole('form', { name: 'Nouveau personnage' });
  await creation.getByLabel('Nom', { exact: true }).fill('Personnage de test');
  await creation.getByRole('button', { name: 'Créer la fiche' }).click();

  async function open(name: string) {
    await page
      .getByRole('tab', { name, exact: true })
      .or(page.getByRole('button', { name, exact: true }))
      .click();
  }

  const save = page.getByRole('button', { name: 'Enregistrer', exact: true });
  await open('Sorts');
  await page.getByRole('button', { name: 'Ajouter un sort' }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Onde fictive');
  await page.getByLabel('Niveau du sort').fill('2');
  await page.getByLabel('Description et effets').fill('<img src="exemple-inexistant">');
  await save.click();
  await expect(page.getByRole('heading', { name: 'Onde fictive' })).toBeVisible();
  await expect(page.getByText('<img src="exemple-inexistant">')).toBeVisible();
  await expect(page.locator('img[src="exemple-inexistant"]')).toHaveCount(0);

  await open('Traits');
  await page.getByRole('button', { name: 'Ajouter un trait passif' }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Trait fictif');
  await page.getByLabel('Coût en points').fill('3');
  await save.click();
  await expect(page.getByRole('heading', { name: 'Trait fictif' })).toBeVisible();

  await open('Équipement');
  await page.getByLabel('Poids de l’armure').selectOption('Lourd');
  await page.getByRole('button', { name: 'Enregistrer le poids' }).click();
  await page.getByRole('button', { name: 'Ajouter une pièce d’armure' }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Casque fictif');
  await page.getByLabel('Palier', { exact: true }).fill('2');
  await save.click();
  await expect(page.getByText('Réserve d’armure 2D8')).toBeVisible();

  await open('Inventaire et banque');
  await page.getByRole('button', { name: 'Ajouter un objet' }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Provisions');
  await page.getByLabel('Quantité').fill('3');
  await save.click();
  await expect(page.getByText('3 en stock')).toBeVisible();
  await page.getByRole('button', { name: 'Modifier Provisions' }).click();
  await page.getByLabel('Quantité').fill('2');
  await save.click();
  await expect(page.getByText('2 en stock')).toBeVisible();

  await page.reload();
  await open('Inventaire et banque');
  await expect(page.getByText('2 en stock')).toBeVisible();
  await open('Équipement');
  await expect(page.getByText('Réserve d’armure 2D8')).toBeVisible();
  await open('Sorts');
  await expect(page.getByRole('heading', { name: 'Onde fictive' })).toBeVisible();
});
