import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import { SessionStore } from './session.store';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const { apiBaseUrl } = inject(API_CONFIG);
  const token = inject(SessionStore).token();

  if (!token || !request.url.startsWith(apiBaseUrl) || request.url.endsWith('/api/auth/login')) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
