import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserEstablishment, UserRole } from '../../../core/auth/auth.models';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';
import { PageResponse } from '../../../core/http/page-response';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  roles: UserRole[];
  establishment: UserEstablishment | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface CreateOperatorUserRequest extends CreateAdminUserRequest {
  establishmentId: string;
}

@Injectable({ providedIn: 'root' })
export class UsersRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  list(page = 0, size = 20): Observable<PageResponse<AdminUser>> {
    return this.http.get<PageResponse<AdminUser>>(apiUrl(this.config, '/api/admin/users'), {
      params: { page, size },
    });
  }

  createAdmin(payload: CreateAdminUserRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(apiUrl(this.config, '/api/admin/users'), {
      ...payload,
      role: 'ADMIN',
    });
  }

  createOperator(payload: CreateOperatorUserRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(apiUrl(this.config, '/api/admin/users'), {
      ...payload,
      role: 'ESTABLISHMENT_OPERATOR',
    });
  }

  update(id: string, payload: Pick<AdminUser, 'email' | 'displayName' | 'active'>): Observable<AdminUser> {
    return this.http.put<AdminUser>(apiUrl(this.config, `/api/admin/users/${id}`), payload);
  }

  resetPassword(id: string, password: string): Observable<void> {
    return this.http.put<void>(apiUrl(this.config, `/api/admin/users/${id}/password`), { password });
  }
}
