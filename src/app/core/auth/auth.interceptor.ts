import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_CONFIG, isApiRequest } from '../config/api.config';
import { SessionStore } from './session.store';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(API_CONFIG);
  const session = inject(SessionStore);
  const router = inject(Router);
  const token = session.token();

  if (!token || !isApiRequest(config, request.url) || request.url.endsWith('/api/auth/login')) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        session.clear();
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
