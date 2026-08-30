import { expect, Page, test } from '@playwright/test';

const adminEmail = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@edifmisti.pe';
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];

test.skip(!adminPassword, 'E2E_ADMIN_PASSWORD is required for real UI smoke tests.');

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(adminEmail);
  await page.getByLabel('Contraseña').fill(adminPassword!);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function expectTitle(page: Page, title: string) {
  await expect(page.locator('app-page-title h1')).toContainText(title);
}

async function clickFirstIfVisible(page: Page, selector: string): Promise<boolean> {
  const locator = page.locator(selector).first();
  if (await locator.isVisible().catch(() => false)) {
    await locator.click();
    return true;
  }

  return false;
}

test('admin exercises navigation and non destructive controls', async ({ page }) => {
  await login(page);
  await expectTitle(page, 'Dashboard');
  await expect(page.getByText('Acceso global').first()).toBeVisible();

  await page.getByPlaceholder('Buscar documento de paciente...').fill('00000000');
  await page.getByPlaceholder('Buscar documento de paciente...').press('Enter');
  await expect(page).toHaveURL(/\/pacientes\?documentNumber=00000000/);

  await page.goto('/pacientes');
  await expectTitle(page, 'Pacientes');
  await page.getByPlaceholder('Ej. 76543210').fill('00000000');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expectTitle(page, 'Pacientes');
  const firstPatientDetail = page.getByRole('link', { name: 'Ver detalle' }).first();
  if (await firstPatientDetail.isVisible().catch(() => false)) {
    await firstPatientDetail.click();
    await expect(page.locator('app-page-title h1')).toBeVisible();
    await page.goBack();
  }

  await page.goto('/citas');
  await expectTitle(page, 'Citas');
  await page.getByLabel('Estado').selectOption('SCHEDULED');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  const firstAppointmentDetail = page.getByRole('link', { name: 'Ver detalle' }).first();
  if (await firstAppointmentDetail.isVisible().catch(() => false)) {
    await firstAppointmentDetail.click();
    await expectTitle(page, 'Detalle de cita');
    await page.getByRole('link', { name: /Volver/i }).click();
  }

  await page.goto('/recordatorios');
  await expectTitle(page, 'Recordatorios');
  await page.getByLabel('Estado').selectOption('SENT');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await clickFirstIfVisible(page, 'button[aria-label="Ver detalle"]');
  await expect(page.getByText('Detalle del recordatorio')).toBeVisible();

  await page.goto('/importaciones');
  await expectTitle(page, 'Importaciones CRED');
  await page.getByRole('link', { name: /Nueva importación/i }).click();
  await expectTitle(page, 'Nueva importación');
  await expect(page.getByText('1 Archivo')).toBeVisible();
  await expect(page.getByText('6 Resultado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analizar archivo' })).toBeDisabled();

  await page.goto('/contactos');
  await expectTitle(page, 'Contactos');
  await page.getByRole('button', { name: 'Crear contacto' }).click();
  await expect(page.getByRole('heading', { name: 'Crear contacto' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await clickFirstIfVisible(page, 'button:has-text("Editar")');
  if (await page.getByRole('heading', { name: 'Editar contacto' }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Cancelar' }).click();
  }
  await clickFirstIfVisible(page, 'button:has-text("Consentimiento")');
  if (await page.getByRole('heading', { name: /Consentimiento/i }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Cancelar' }).click();
  }

  await page.goto('/usuarios');
  await expectTitle(page, 'Usuarios');
  await page.getByRole('button', { name: /Crear usuario/i }).click();
  await expect(page.getByRole('heading', { name: 'Crear usuario' })).toBeVisible();
  await page.getByLabel('Tipo de cuenta').selectOption('ESTABLISHMENT_OPERATOR');
  await page.getByRole('button', { name: /Seleccionar establecimiento/i }).click();
  await page.getByPlaceholder('Buscar establecimiento...').fill('misti');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await clickFirstIfVisible(page, 'button:has-text("Restablecer contraseña")');
  if (await page.getByRole('heading', { name: 'Restablecer contraseña' }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Cancelar' }).click();
  }

  await page.goto('/configuracion');
  await expectTitle(page, 'Configuración');
  await expect(page.getByText('WhatsApp')).toBeVisible();
});
