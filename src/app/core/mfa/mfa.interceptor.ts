import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_CONFIG, isApiRequest } from '../config/api.config';
import { MfaStore } from './mfa.store';

export const mfaInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(API_CONFIG);
  const store = inject(MfaStore);
  const token = store.token();

  if (!token || !isApiRequest(config, request.url) || !requiresMfaHeader(request.method, request.url)) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { 'X-MFA-Token': token } }));
};

function requiresMfaHeader(method: string, requestUrl: string): boolean {
  const path = requestPath(requestUrl);

  if (method === 'GET' && path === '/api/me/mfa') {
    return true;
  }

  if (path === '/api/admin/cred-reminder-audience') {
    return method === 'GET' || method === 'PUT';
  }

  if (method === 'POST' && (path === '/api/admin/users' || path === '/api/admin/users/admins')) {
    return true;
  }

  return method === 'PUT' && /^\/api\/admin\/users\/[^/]+(?:\/authorization|\/password)?$/.test(path);
}

function requestPath(requestUrl: string): string {
  try {
    return new URL(requestUrl, globalThis.location?.origin).pathname;
  } catch {
    return '';
  }
}
