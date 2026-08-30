import { expect, Page, test } from '@playwright/test';

const establishments = [
  { id: 11, name: 'Centro de Salud Mariano Melgar', active: true,
    microred: { id: 21, name: 'Microred Mariano Melgar' }, red: { id: 31, name: 'Red Arequipa Caylloma' } },
  { id: 12, name: 'Centro de Salud Generalísimo San Martín', active: true,
    microred: { id: 22, name: 'Microred Alto Selva Alegre' }, red: { id: 31, name: 'Red Arequipa Caylloma' } },
  { id: 13, name: 'Puesto de Salud Atalaya', active: true,
    microred: { id: 23, name: 'Microred Hunter' }, red: { id: 31, name: 'Red Arequipa Caylloma' } },
];

async function mockMasterAdmin(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('citas_altoq_session', JSON.stringify({
      accessToken: 'visual-test-token',
      expiresAt: Date.now() + 60 * 60 * 1000,
      remember: true,
    }));
  });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/me') {
      await route.fulfill({ json: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'master@edifmisti.pe',
        displayName: 'Administrador maestro',
        active: true,
        masterAdmin: true,
        roles: ['ADMIN'],
        establishment: null,
      } });
      return;
    }
    if (path === '/api/cred/operations/status') {
      await route.fulfill({ json: {
        whatsAppEnabled: true,
        reminderSchedulerEnabled: true,
        credSyncEnabled: true,
        credTemplateEnabled: true,
        credDispatchEnabled: false,
      } });
      return;
    }
    if (path === '/api/admin/establishments') {
      await route.fulfill({ json: establishments });
      return;
    }
    if (path === '/api/admin/cred-reminder-audience') {
      await route.fulfill({ json: {
        mode: 'SELECTED',
        selectedEstablishments: [{
          id: 11,
          name: establishments[0].name,
          active: true,
          microredId: 21,
          microredName: establishments[0].microred.name,
          redId: 31,
          redName: establishments[0].red.name,
        }],
        updatedAt: '2026-08-30T17:30:00Z',
      } });
      return;
    }
    await route.fulfill({ status: 404, json: {} });
  });
}

test('master admin configures reminder audience without responsive overflow', async ({ page }) => {
  await mockMasterAdmin(page);
  await page.goto('/configuracion');
  await expect(page.getByRole('heading', { name: 'Establecimientos habilitados para recordatorios' })).toBeVisible();
  await expect(page.getByText('establecimiento habilitado', { exact: true })).toBeVisible();
  await expect(page.getByText('Centro de Salud Mariano Melgar')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/reminder-audience-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Establecimientos habilitados para recordatorios' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/reminder-audience-mobile.png', fullPage: true });
});
