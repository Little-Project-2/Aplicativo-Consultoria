import { expect, test } from '@playwright/test';

test('toggles the visual theme and opens the login flow', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('consultoria-theme-v1');
  });

  await page.goto('/');

  await expect(page.locator('[data-auth-view="home"]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fitness-green');

  await page.getByRole('button', { name: 'Alternar para tema dourado' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'solar-ember');

  await page.locator('[data-auth-view="home"]').getByRole('button', { exact: true, name: 'Entrar' }).click();
  await expect(page.locator('[data-auth-view="login"]')).toBeVisible();

  await page.getByRole('radio', { name: 'Entrar como Treinador' }).click();
  await expect(page.getByRole('radio', { name: 'Entrar como Treinador' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Entrar como Treinador' })).toBeVisible();
});
