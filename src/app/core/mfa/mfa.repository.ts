import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, apiUrl } from '../config/api.config';
import { MfaConfirmResponse, MfaElevation, MfaSetupResponse, MfaStatus } from './mfa.models';

@Injectable({ providedIn: 'root' })
export class MfaRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  status(): Observable<MfaStatus> {
    return this.http.get<MfaStatus>(apiUrl(this.config, '/api/me/mfa'));
  }

  setup(password: string, code?: string): Observable<MfaSetupResponse> {
    return this.http.post<MfaSetupResponse>(apiUrl(this.config, '/api/me/mfa/setup'), compact({ password, code }));
  }

  confirm(code: string): Observable<MfaConfirmResponse> {
    return this.http.post<MfaConfirmResponse>(apiUrl(this.config, '/api/me/mfa/confirm'), { code });
  }

  verify(code: string): Observable<MfaElevation> {
    return this.http.post<MfaElevation>(apiUrl(this.config, '/api/me/mfa/verify'), { code });
  }

  recover(password: string, recoveryCode: string): Observable<MfaSetupResponse> {
    return this.http.post<MfaSetupResponse>(apiUrl(this.config, '/api/me/mfa/recover'), { password, recoveryCode });
  }

  lock(): Observable<void> {
    return this.http.post<void>(apiUrl(this.config, '/api/me/mfa/lock'), {});
  }
}

function compact<T extends Record<string, string | undefined>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item)) as Partial<T>;
}
