import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';
import { PageResponse } from '../../../core/http/page-response';

export interface Reminder {
  id: string;
  contactId: string;
  templateId: string | null;
  purpose: string;
  credAppointmentId: string | null;
  status: string;
  scheduledAt: string;
  cancelReason: string | null;
  failureReason: string | null;
  sentAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RemindersRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  list(filters: {
    red?: string;
    microred?: string;
    establishment?: string;
    page?: number;
    size?: number;
  }): Observable<PageResponse<Reminder>> {
    return this.http.get<PageResponse<Reminder>>(apiUrl(this.config, '/api/cred/reminders'), {
      params: paramsFrom(filters),
    });
  }
}

function paramsFrom(filters: Record<string, string | number | boolean | null | undefined>): HttpParams {
  return Object.entries(filters).reduce((params, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return params;
    }

    return params.set(key, String(value));
  }, new HttpParams());
}
