import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_CONFIG } from '../config/api.config';

export const requestTracingInterceptor: HttpInterceptorFn = (request, next) => {
  const { apiBaseUrl } = inject(API_CONFIG);

  if (!request.url.startsWith(apiBaseUrl)) {
    return next(request);
  }

  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return next(request.clone({ setHeaders: { 'X-Request-ID': requestId } }));
};
