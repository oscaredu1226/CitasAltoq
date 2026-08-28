import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { mapApiError } from '../http/error-message.mapper';
import { AuthApiRepository } from './auth.repository';
import { CurrentUser } from './auth.models';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly api = inject(AuthApiRepository);
  private readonly router = inject(Router);
  readonly session = inject(SessionStore);

  login(email: string, password: string, remember: boolean): Observable<CurrentUser> {
    return this.api.login({ email, password }).pipe(
      switchMap((response) => {
        const expiresAt = Date.now() + response.expiresIn * 1000;
        this.session.setSession({ accessToken: response.accessToken, expiresAt, remember });
        return this.api.me();
      }),
      tap((user) => this.session.setUser(user)),
      catchError((error) => {
        this.session.clear();
        return throwError(() => mapApiError(error).message);
      }),
    );
  }

  restore(): Observable<boolean> {
    if (this.session.user()) {
      return of(true);
    }

    if (!this.session.token()) {
      return of(false);
    }

    this.session.setRestoring(true);
    return this.api.me().pipe(
      tap((user) => this.session.setUser(user)),
      map(() => true),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.session.clear();
        }

        return of(false);
      }),
      finalize(() => this.session.setRestoring(false)),
    );
  }

  logout(): void {
    this.session.clear();
    void this.router.navigateByUrl('/login');
  }
}
