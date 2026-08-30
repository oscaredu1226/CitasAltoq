import { test } from '@playwright/test';

const adminEmail = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@edifmisti.pe';
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];

test.skip(!adminPassword, 'E2E_ADMIN_PASSWORD is required for login diagnostics.');

test('diagnoses login network behavior without logging credentials', async ({ page }) => {
  const events: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      events.push(`request ${request.method()} ${request.url()}`);
    }
  });
  page.on('response', (response) => {
    if (response.url().includes('/api/')) {
      events.push(`response ${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/')) {
      events.push(`failed ${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'unknown'}`);
    }
  });
  page.on('console', (message) => {
    const text = message.text();
    if (text.includes('Access-Control') || text.includes('CORS') || text.includes('/api/')) {
      events.push(`console ${message.type()} ${text}`);
    }
  });

  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(adminEmail);
  await page.getByLabel('Contraseña').fill(adminPassword!);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForTimeout(8000);

  console.info(events.join('\n') || 'no api events captured');
  console.info(`url=${page.url()}`);
  console.info(`loginErrorVisible=${await page.getByText('Credenciales incorrectas').isVisible()}`);
});
