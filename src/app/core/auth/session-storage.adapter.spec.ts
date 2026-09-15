import { SessionStorageAdapter } from './session-storage.adapter';

describe('SessionStorageAdapter', () => {
  let adapter: SessionStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    adapter = new SessionStorageAdapter();
  });

  it('stores regular sessions in sessionStorage', () => {
    adapter.write({ accessToken: 'token', expiresAt: Date.now() + 1000, remember: false });

    expect(sessionStorage.length).toBe(1);
    expect(localStorage.length).toBe(0);
    expect(adapter.read()?.accessToken).toBe('token');
  });

  it('stores remembered sessions in localStorage', () => {
    adapter.write({ accessToken: 'token', expiresAt: Date.now() + 1000, remember: true });

    expect(localStorage.length).toBe(1);
    expect(sessionStorage.length).toBe(0);
  });

  it('drops expired sessions', () => {
    adapter.write({ accessToken: 'token', expiresAt: Date.now() - 1, remember: true });

    expect(adapter.read()).toBeNull();
  });

  it('restores the cached user with an active session', () => {
    adapter.write({
      accessToken: 'token',
      expiresAt: Date.now() + 1000,
      remember: true,
      user: {
        id: 'user-1',
        email: 'operator@example.test',
        displayName: 'Operador',
        active: true,
        masterAdmin: false,
        roles: ['ESTABLISHMENT_OPERATOR'],
        establishment: null,
      },
    });

    expect(adapter.read()?.user?.email).toBe('operator@example.test');
  });
});
