import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AccessScope, UserRole } from '../../../core/auth/auth.models';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';
import { PageResponse } from '../../../core/http/page-response';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  roles: UserRole[];
  accessScopes: AccessScope[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  roles: UserRole[];
  accessScopes: AccessScope[];
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

  create(payload: CreateUserRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(apiUrl(this.config, '/api/admin/users'), payload);
  }

  update(id: string, payload: Pick<AdminUser, 'email' | 'displayName' | 'active'>): Observable<AdminUser> {
    return this.http.put<AdminUser>(apiUrl(this.config, `/api/admin/users/${id}`), payload);
  }

  updateAuthorization(id: string, payload: Pick<AdminUser, 'roles' | 'accessScopes'>): Observable<AdminUser> {
    return this.http.put<AdminUser>(apiUrl(this.config, `/api/admin/users/${id}/authorization`), payload);
  }

  resetPassword(id: string, password: string): Observable<void> {
    return this.http.put<void>(apiUrl(this.config, `/api/admin/users/${id}/password`), { password });
  }
}
