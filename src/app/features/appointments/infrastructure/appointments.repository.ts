import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';
import { PageResponse } from '../../../core/http/page-response';

export interface Appointment {
  id: string;
  patientId: string;
  scheduledDate: string;
  status: string;
  confirmationStatus: string;
  establishment: string;
  rescheduledFromAppointmentId: string | null;
  sourceImportBatchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentDetail {
  appointment: Appointment;
  reminder: AppointmentReminder | null;
}

export interface AppointmentReminder {
  id: string;
  purpose: string;
  status: string;
  scheduledAt: string;
  templateId: string | null;
  sentAt: string | null;
  cancelledAt: string | null;
}

export interface AppointmentFilters {
  patientId?: string;
  scheduledDate?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  confirmationStatus?: string;
  red?: string;
  microred?: string;
  establishment?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class AppointmentsRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  list(filters: AppointmentFilters): Observable<PageResponse<Appointment>> {
    return this.http.get<PageResponse<Appointment>>(apiUrl(this.config, '/api/cred/appointments'), {
      params: paramsFrom(filters),
    });
  }

  get(id: string): Observable<AppointmentDetail> {
    return this.http.get<AppointmentDetail>(apiUrl(this.config, `/api/cred/appointments/${id}`));
  }
}

function paramsFrom<T extends object>(filters: T): HttpParams {
  return (Object.entries(filters) as [string, string | number | boolean | null | undefined][]).reduce((params, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return params;
    }

    return params.set(key, String(value));
  }, new HttpParams());
}
