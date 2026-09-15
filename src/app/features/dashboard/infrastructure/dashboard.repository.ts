import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';
import { DashboardFilters } from '../application/dashboard.facade';

export interface DailyAppointmentSummary {
  date: string;
  total: number;
  confirmed: number;
  cannotAttend: number;
  noResponse: number;
}

export interface DashboardSummary {
  today: DailyAppointmentSummary;
  tomorrow: DailyAppointmentSummary;
}

@Injectable({ providedIn: 'root' })
export class DashboardRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  summary(filters: DashboardFilters): Observable<DashboardSummary> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<DashboardSummary>(apiUrl(this.config, '/api/cred/dashboard/summary'), { params });
  }
}
