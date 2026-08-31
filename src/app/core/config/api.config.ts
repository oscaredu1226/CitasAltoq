import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ApiConfig {
  apiBaseUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG', {
  providedIn: 'root',
  factory: () => ({ apiBaseUrl: environment.apiBaseUrl }),
});

export function apiUrl(config: ApiConfig, path: string): string {
  const base = config.apiBaseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function isApiRequest(config: ApiConfig, requestUrl: string): boolean {
  const base = config.apiBaseUrl.replace(/\/$/, '');

  if (!base) {
    return requestUrl.startsWith('/api/');
  }

  try {
    const api = new URL(base, globalThis.location?.origin);
    const request = new URL(requestUrl, globalThis.location?.origin);
    return request.origin === api.origin && request.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}
