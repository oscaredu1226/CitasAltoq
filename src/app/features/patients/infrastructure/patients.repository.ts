import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';
import { PageResponse } from '../../../core/http/page-response';

export interface Patient {
  id: string;
  documentType: string;
  documentNumber: string;
  name: string;
  birthDate: string;
  gender: string;
  clinicalHistory: string;
  address: string;
  district: string;
  province: string;
  guardianContactId: string | null;
  establishment: string;
  microNetwork: string;
  network: string;
  ageGroup: string;
  observations: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientFilters {
  documentNumber?: string;
  clinicalHistory?: string;
  red?: string;
  microred?: string;
  establishment?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
}

export interface PatientAppointment {
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

@Injectable({ providedIn: 'root' })
export class PatientsRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly cache = new Map<string, Observable<Patient | null>>();

  list(filters: PatientFilters): Observable<PageResponse<Patient>> {
    return this.http.get<PageResponse<Patient>>(apiUrl(this.config, '/api/cred/patients'), {
      params: paramsFrom(filters),
    });
  }

  get(id: string): Observable<Patient> {
    return this.http.get<Patient>(apiUrl(this.config, `/api/cred/patients/${id}`));
  }

  lookup(id: string | null | undefined): Observable<Patient | null> {
    if (!id) {
      return of(null);
    }

    if (!this.cache.has(id)) {
      this.cache.set(id, this.get(id).pipe(shareReplay({ bufferSize: 1, refCount: false })));
    }

    return this.cache.get(id)!;
  }

  appointments(id: string, page = 0, size = 10): Observable<PageResponse<PatientAppointment>> {
    return this.http.get<PageResponse<PatientAppointment>>(
      apiUrl(this.config, `/api/cred/patients/${id}/appointments`),
      { params: paramsFrom({ page, size }) },
    );
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
