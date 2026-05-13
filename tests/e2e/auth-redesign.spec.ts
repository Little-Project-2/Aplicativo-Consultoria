import { expect, test } from '@playwright/test';

test('toggles the visual theme and opens the login flow', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  await page.addInitScript(() => {
    window.localStorage.removeItem('consultoria-theme-v1');
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[data-auth-view="home"]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'fitness-green');

  await page.getByRole('button', { name: 'Alternar para tema dourado' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'solar-ember');

  await page.locator('[data-auth-view="home"]').getByRole('button', { exact: true, name: 'Entrar' }).click();
  await expect(page.locator('[data-auth-view="login"]')).toBeVisible();

  await page.getByRole('radio', { name: 'Entrar como Treinador' }).click();
  await expect(page.getByRole('radio', { name: 'Entrar como Treinador' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Entrar como Treinador' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Treinador Demo/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Aluno Demo/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Resetar Sandbox/ })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('resets the local sandbox without removing non-demo data', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'sandbox storage reset is covered once on desktop');
  test.setTimeout(60_000);

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'trainerStudents',
      JSON.stringify([
        { id: '99999', name: 'Aluno Real Local', trainerCode: '54321', active: true },
        { id: '12345', name: 'Nicolas Alterado', trainerCode: '00001', active: true }
      ])
    );
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-auth-view="home"]').getByRole('button', { exact: true, name: 'Entrar' }).click();

  const resetButton = page.getByRole('button', { name: /Resetar Sandbox/ });
  await expect(resetButton).toBeEnabled();
  await resetButton.click();
  await expect(page.getByText(/Sandbox restaurado/)).toBeVisible();

  const sandboxState = await page.evaluate(() => {
    const students = JSON.parse(window.localStorage.getItem('trainerStudents') || '[]') as Array<{
      id?: string;
      name?: string;
      trainerCode?: string;
    }>;
    return {
      demoNames: students
        .filter((student) => ['12345', '77777'].includes(String(student.id || '')))
        .map((student) => student.name)
        .sort(),
      hasNicolas: students.some((student) => student.id === '12345' && student.name === 'Nicolas'),
      hasDiego: students.some((student) => student.id === '77777' && student.name === 'Diego'),
      hasLocalStudent: students.some((student) => student.id === '99999' && student.name === 'Aluno Real Local')
    };
  });

  expect(sandboxState).toEqual({
    demoNames: ['Diego', 'Nicolas'],
    hasNicolas: true,
    hasDiego: true,
    hasLocalStudent: true
  });
});

test('opens trainer and student demo dashboards from login', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'legacy sandbox dashboard boot is covered once on desktop');
  test.setTimeout(60_000);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-auth-view="home"]').getByRole('button', { exact: true, name: 'Entrar' }).click();

  await page.getByRole('button', { name: /Treinador Demo/ }).click();
  await page.waitForURL(/trainer\.html/);
  await expect(page.locator('#trainer-dashboard-screen.active')).toBeVisible({ timeout: 15_000 });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-auth-view="home"]').getByRole('button', { exact: true, name: 'Entrar' }).click();
  await page.getByRole('button', { name: /Aluno Demo/ }).click();
  await expect(page.locator('#student-dashboard-screen.active')).toBeVisible({ timeout: 15_000 });
});
