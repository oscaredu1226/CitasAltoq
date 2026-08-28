import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, apiUrl } from '../config/api.config';
import { CurrentUser, LoginRequest, LoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(apiUrl(this.config, '/api/auth/login'), payload);
  }

  me(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(apiUrl(this.config, '/api/me'));
  }
}
