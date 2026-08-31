import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_CONFIG, isApiRequest } from '../config/api.config';

export const requestTracingInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(API_CONFIG);

  if (!isApiRequest(config, request.url)) {
    return next(request);
  }

  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return next(request.clone({ setHeaders: { 'X-Request-ID': requestId } }));
};
