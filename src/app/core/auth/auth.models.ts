export type UserRole = 'ADMIN' | 'ESTABLISHMENT_OPERATOR';

export interface RedSummary {
  id: string;
  name: string;
}

export interface MicroredSummary {
  id: string;
  name: string;
}

export interface UserEstablishment {
  id: string;
  name: string;
  microred: MicroredSummary;
  red: RedSummary;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  masterAdmin: boolean;
  roles: UserRole[];
  establishment: UserEstablishment | null;
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

export function isMasterAdmin(user: CurrentUser | null): boolean {
  return user?.masterAdmin === true;
}

export function primaryEstablishment(user: CurrentUser | null): UserEstablishment | null {
  return user?.establishment ?? null;
}

export function organizationLabel(user: CurrentUser | null): string {
  if (!user) {
    return '';
  }

  if (isAdmin(user)) {
    return 'Acceso global';
  }

  const establishment = primaryEstablishment(user);
  return [establishment?.name, establishment?.microred?.name, establishment?.red?.name].filter(Boolean).join(' · ');
}
