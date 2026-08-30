import { expect, Page, test } from '@playwright/test';

const adminEmail = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@edifmisti.pe';
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];
const createOperator = process.env['E2E_CREATE_OPERATOR'] === 'true';
const qaPassword = `Qa.${Date.now()}.Pass#`;
const qaEmail = `qa.operator.${Date.now()}@example.com`;
const qaName = 'Operador QA';

test.describe.configure({ mode: 'serial' });
test.skip(!adminPassword, 'E2E_ADMIN_PASSWORD is required for real backend E2E tests.');

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  const loginResponse = page.waitForResponse((response) => response.url().endsWith('/api/auth/login'));
  const meResponse = page.waitForResponse((response) => response.url().endsWith('/api/me'));
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  expect((await loginResponse).ok()).toBe(true);
  const response = await meResponse;
  expect(response.ok()).toBe(true);
  await expect(page).toHaveURL(/\/dashboard$/);
  return response.json();
}

test('admin can login and open every admin route', async ({ page }) => {
  const me = await login(page, adminEmail, adminPassword!);
  expect(me.roles).toContain('ADMIN');

  for (const route of ['/dashboard', '/pacientes', '/citas', '/importaciones', '/recordatorios', '/contactos', '/usuarios', '/configuracion']) {
    await page.goto(route);
    await expect(page).not.toHaveURL(/\/403$/);
    await expect(page.locator('app-page-title h1')).toBeVisible();
  }
});

test('admin can create a QA establishment operator from the real dropdown', async ({ page }) => {
  test.skip(!createOperator, 'Set E2E_CREATE_OPERATOR=true to create a real QA operator.');

  await login(page, adminEmail, adminPassword!);
  await page.goto('/usuarios');
  await page.getByRole('button', { name: /Crear usuario/i }).click();
  await page.getByLabel('Correo').fill(qaEmail);
  await page.getByLabel('Nombre visible').fill(qaName);
  await page.getByLabel('Contraseña', { exact: true }).fill(qaPassword);
  await page.getByLabel('Confirmar contraseña').fill(qaPassword);
  await page.getByLabel('Tipo de cuenta').selectOption('ESTABLISHMENT_OPERATOR');
  await page.getByRole('button', { name: /Seleccionar establecimiento/i }).click();
  await page.getByPlaceholder('Buscar establecimiento...').fill('edif');
  const option = page.getByRole('option').filter({ hasText: /CENTRO DE SALUD EDIFICADORES MISTI/i }).first();
  await expect(option).toContainText(/EDIFICADORES MISTI/i);
  await expect(option).toContainText(/AREQUIPA CAYLLOMA/i);
  await option.click();

  const createResponse = page.waitForResponse((response) => response.url().includes('/api/admin/users') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Guardar cambios/i }).click();
  expect((await createResponse).ok()).toBe(true);
  await expect(page.getByText(/Usuario creado/i)).toBeVisible();
});

test('QA operator can login only to allowed sections', async ({ page }) => {
  test.skip(!createOperator, 'Set E2E_CREATE_OPERATOR=true to login with the generated QA operator.');

  await login(page, qaEmail, qaPassword);
  await expect(page.getByText('Operador de establecimiento')).toBeVisible();
  await expect(page.getByText(/CENTRO DE SALUD EDIFICADORES MISTI/i).first()).toBeVisible();
  await expect(page.getByText(/EDIFICADORES MISTI/i).first()).toBeVisible();
  await expect(page.getByText(/AREQUIPA CAYLLOMA/i).first()).toBeVisible();

  for (const label of ['Dashboard', 'Pacientes', 'Citas', 'Recordatorios']) {
    await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible();
  }

  for (const label of ['Importaciones CRED', 'Contactos', 'Usuarios', 'Configuración']) {
    await expect(page.getByRole('link', { name: label, exact: true })).toHaveCount(0);
  }

  for (const route of ['/dashboard', '/pacientes', '/citas', '/recordatorios']) {
    await page.goto(route);
    await expect(page).not.toHaveURL(/\/403$/);
    await expect(page.locator('app-page-title h1')).toBeVisible();
  }

  for (const denied of ['/importaciones', '/contactos', '/usuarios', '/configuracion']) {
    await page.goto(denied);
    await expect(page).toHaveURL(/\/403$/);
  }
});
