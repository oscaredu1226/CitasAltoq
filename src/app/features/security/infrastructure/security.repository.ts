import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';
import {
  CreateIpBlockRequest,
  SecurityEventFilters,
  SecurityEventPage,
  SecurityIpBlock,
  SecurityIpBlockPage,
  SecurityOverview,
} from './security.models';

@Injectable({ providedIn: 'root' })
export class SecurityRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  overview(hours: number): Observable<SecurityOverview> {
    return this.http.get<SecurityOverview>(apiUrl(this.config, '/api/admin/security/overview'), {
      params: new HttpParams().set('hours', hours),
    });
  }

  events(filters: SecurityEventFilters): Observable<SecurityEventPage> {
    let params = new HttpParams()
      .set('hours', filters.hours)
      .set('page', filters.page)
      .set('size', filters.size);
    if (filters.type) {
      params = params.set('type', filters.type);
    }
    if (filters.outcome) {
      params = params.set('outcome', filters.outcome);
    }
    return this.http.get<SecurityEventPage>(apiUrl(this.config, '/api/admin/security/events'), { params });
  }

  blocks(activeOnly: boolean, page: number, size: number): Observable<SecurityIpBlockPage> {
    const params = new HttpParams()
      .set('activeOnly', activeOnly)
      .set('page', page)
      .set('size', size);
    return this.http.get<SecurityIpBlockPage>(apiUrl(this.config, '/api/admin/security/ip-blocks'), { params });
  }

  block(request: CreateIpBlockRequest): Observable<SecurityIpBlock> {
    return this.http.post<SecurityIpBlock>(apiUrl(this.config, '/api/admin/security/ip-blocks'), request);
  }

  unblock(id: string): Observable<SecurityIpBlock> {
    return this.http.delete<SecurityIpBlock>(apiUrl(this.config, `/api/admin/security/ip-blocks/${id}`));
  }
}
