import { routes } from './app.routes';

describe('app routes', () => {
  it('protects administrative routes with role guards', () => {
    const shellRoute = routes.find((route) => route.path === '');
    const protectedPaths = ['importaciones', 'importaciones/nueva', 'importaciones/:id', 'contactos', 'usuarios', 'configuracion'];

    for (const path of protectedPaths) {
      const route = shellRoute?.children?.find((child) => child.path === path);
      expect(route?.canActivate?.length).toBeGreaterThan(0);
    }
  });
});
