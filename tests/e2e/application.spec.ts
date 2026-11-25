import { test, expect } from '@playwright/test';

test('Application loads successfully', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  const response = await page.goto('/');

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('#app')).not.toBeEmpty();
  expect(errors).toEqual([]);
});
