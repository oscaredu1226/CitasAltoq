import { CurrentUser, organizationLabel } from './auth.models';

describe('auth models', () => {
  it('uses establishment and Red for the current user organization label', () => {
    const user: CurrentUser = {
      id: 'user-1',
      email: 'operator@example.test',
      displayName: 'Operador',
      active: true,
      masterAdmin: false,
      roles: ['ESTABLISHMENT_OPERATOR'],
      establishment: {
        id: 'est-1',
        name: 'C.S. Misti',
        microred: { id: 'micro-1', name: 'Microred Misti' },
        red: { id: 'red-1', name: 'Red Arequipa' },
      },
    };

    expect(organizationLabel(user)).toBe('C.S. Misti · Microred Misti · Red Arequipa');
  });

  it('keeps admins global without establishment data', () => {
    expect(organizationLabel({
      id: 'admin-1',
      email: 'admin@example.test',
      displayName: 'Admin',
      active: true,
      masterAdmin: true,
      roles: ['ADMIN'],
      establishment: null,
    })).toBe('Acceso global');
  });
});
