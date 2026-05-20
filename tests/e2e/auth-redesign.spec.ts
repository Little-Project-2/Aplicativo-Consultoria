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
  await expect(page.getByRole('button', { name: /Treinador Teste/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Aluno Teste/ })).toBeVisible();
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
        { id: '12345', name: 'Aluno Antigo Alterado', trainerCode: '00001', active: true },
        { id: '77777', name: 'Demo legado', trainerCode: '00001', active: true }
      ])
    );
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-auth-view="home"]').getByRole('button', { exact: true, name: 'Entrar' }).click();

  const resetButton = page.getByRole('button', { name: /Resetar Sandbox/ });
  await expect(resetButton).toBeEnabled({ timeout: 15_000 });
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
      hasTestStudent: students.some((student) => student.id === '12345' && student.name === 'Aluno Teste'),
      hasLegacyDemoStudent: students.some((student) => student.id === '77777'),
      hasLocalStudent: students.some((student) => student.id === '99999' && student.name === 'Aluno Real Local')
    };
  });

  expect(sandboxState).toEqual({
    demoNames: ['Aluno Teste'],
    hasTestStudent: true,
    hasLegacyDemoStudent: false,
    hasLocalStudent: true
  });
});

test('opens trainer and student test dashboards from login', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'legacy sandbox dashboard boot is covered once on desktop');
  test.setTimeout(60_000);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-auth-view="home"]').getByRole('button', { exact: true, name: 'Entrar' }).click();

  await page.getByRole('button', { name: /Treinador Teste/ }).click();
  await page.waitForURL(/trainer\.html/);
  await expect(page.locator('#trainer-dashboard-screen.active')).toBeVisible({ timeout: 15_000 });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-auth-view="home"]').getByRole('button', { exact: true, name: 'Entrar' }).click();
  await page.getByRole('button', { name: /Aluno Teste/ }).click();
  await expect(page.locator('#student-dashboard-screen.active')).toBeVisible({ timeout: 15_000 });
});

test('switches between trainer and student test accounts from the trainer dashboard', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'test account switcher is covered once on desktop');
  test.setTimeout(120_000);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-auth-view="home"]').getByRole('button', { exact: true, name: 'Entrar' }).click();
  await page.getByRole('button', { name: /Treinador Teste/ }).click();
  await page.waitForURL(/trainer\.html/);

  await expect(page.locator('#trainer-dashboard-screen.active')).toBeVisible({ timeout: 15_000 });
  const switchToStudentButton = page.locator(
    '#trainer-dashboard-screen .dashboard-header-actions [data-test-account-switcher="trainer"]'
  );
  await expect(switchToStudentButton).toBeVisible();
  await expect(switchToStudentButton).toContainText('Entrar como aluno teste');

  expect(await page.evaluate(() => window.localStorage.getItem('currentUserRole'))).toBe('trainer');

  await switchToStudentButton.click();
  await expect(page.locator('#student-dashboard-screen.active')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#student-test-switch-banner')).toBeVisible();
  await expect(page.locator('#student-test-switch-banner')).toContainText('Você está visualizando como aluno teste');

  const studentSwitchState = await page.evaluate(() => ({
    currentRole: window.localStorage.getItem('currentUserRole'),
    currentStudentId: window.localStorage.getItem('currentStudentId'),
    switchMode: window.localStorage.getItem('test_account_switch_mode_v1')
  }));
  expect(studentSwitchState).toEqual({
    currentRole: 'student',
    currentStudentId: '12345',
    switchMode: 'student-test'
  });

  await page.locator('#student-test-switch-banner').getByRole('button', { name: /Voltar para treinador/ }).click();
  await expect(page.locator('#trainer-dashboard-screen.active')).toBeVisible({ timeout: 15_000 });
  await expect(switchToStudentButton).toBeVisible();

  const trainerSwitchState = await page.evaluate(() => ({
    currentRole: window.localStorage.getItem('currentUserRole'),
    currentStudentId: window.localStorage.getItem('currentStudentId'),
    switchMode: window.localStorage.getItem('test_account_switch_mode_v1')
  }));
  expect(trainerSwitchState).toEqual({
    currentRole: 'trainer',
    currentStudentId: null,
    switchMode: null
  });
});
