export type UserRole = 'ADMIN' | 'ESTABLISHMENT_OPERATOR';
export type AccessScopeLevel = 'GLOBAL' | 'RED' | 'MICRORED' | 'ESTABLISHMENT';

export interface AccessScope {
  level: AccessScopeLevel;
  red: string | null;
  microred: string | null;
  establishment: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  roles: UserRole[];
  accessScopes: AccessScope[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer' | string;
  expiresIn: number;
}

export interface StoredSession {
  accessToken: string;
  expiresAt: number;
  remember: boolean;
}

export function roleLabel(role: UserRole | undefined): string {
  if (role === 'ADMIN') {
    return 'Administrador';
  }

  if (role === 'ESTABLISHMENT_OPERATOR') {
    return 'Operador de establecimiento';
  }

  return 'Sin rol';
}

export function isAdmin(user: CurrentUser | null): boolean {
  return user?.roles.includes('ADMIN') ?? false;
}

export function primaryScope(user: CurrentUser | null): AccessScope | null {
  return user?.accessScopes[0] ?? null;
}
