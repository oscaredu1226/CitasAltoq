import { PageResponse } from '../../../core/http/page-response';

export type SecurityEventType =
  | 'LOGIN_EXITOSO'
  | 'LOGIN_FALLIDO'
  | 'LOGIN_BLOQUEADO'
  | 'ACCESO_DENEGADO'
  | 'MFA_RECHAZADO'
  | 'MFA_VERIFICADO'
  | 'MFA_ACTIVADO'
  | 'MFA_RECUPERACION_USADA'
  | 'MFA_BLOQUEADO'
  | 'IP_BLOQUEADA'
  | 'IP_DESBLOQUEADA'
  | 'ERROR_SERVIDOR';

export type SecurityEventOutcome = 'EXITO' | 'FALLO' | 'BLOQUEADO';

export interface SecurityEvent {
  id: string;
  occurredAt: string;
  type: SecurityEventType;
  typeLabel: string;
  outcome: SecurityEventOutcome;
  outcomeLabel: string;
  clientIpMasked: string;
  httpMethod: string | null;
  requestPath: string | null;
  statusCode: number | null;
  requestId: string | null;
  detailCode: string | null;
  detailLabel: string | null;
  blockable: boolean;
}

export interface SecurityMetric {
  type: SecurityEventType;
  label: string;
  total: number;
}

export interface SecurityOverview {
  hours: number;
  totalEvents: number;
  failedLogins: number;
  blockedLogins: number;
  accessDenied: number;
  serverErrors: number;
  distinctRiskIps: number;
  activeIpBlocks: number;
  metrics: SecurityMetric[];
  recentEvents: SecurityEvent[];
}

export interface SecurityIpBlock {
  id: string;
  clientIpMasked: string;
  reason: string;
  sourceEventId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  active: boolean;
}

export interface SecurityEventFilters {
  type?: SecurityEventType;
  outcome?: SecurityEventOutcome;
  hours: number;
  page: number;
  size: number;
}

export interface CreateIpBlockRequest {
  sourceEventId: string;
  durationMinutes: number;
  reason: string;
}

export type SecurityEventPage = PageResponse<SecurityEvent>;
export type SecurityIpBlockPage = PageResponse<SecurityIpBlock>;
