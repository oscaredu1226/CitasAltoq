import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';
import { PageResponse } from '../../../core/http/page-response';

export interface ImportScopeOption {
  name: string;
  rowCount: number;
  microreds?: ImportScopeOption[];
  establishments?: ImportScopeOption[];
}

export interface ImportScopesResponse {
  totalDataRows: number;
  reds: ImportScopeOption[];
}

export interface ImportScope {
  red: string | null;
  microred: string | null;
  establishment: string | null;
}

export interface ImportIssue {
  sourceRowNumber: number;
  field: string;
  severity: 'WARNING' | 'ERROR';
  code: string;
  message: string;
}

export interface ImportPreview {
  fileName: string;
  fileChecksum: string;
  scopeFingerprint: string;
  scope: ImportScope;
  totalDataRows: number;
  rowsInScope: number;
  rowsExcludedByScope: number;
  processableSourceRows: number;
  sourceErrorRows: number;
  sourceWarningRows: number;
  newPatients: number;
  updatedPatients: number;
  unchangedPatients: number;
  newContacts: number;
  reusedContacts: number;
  patientsWithoutUsableGuardian: number;
  newAppointments: number;
  rescheduledAppointments: number;
  unchangedAppointments: number;
  reviewRequiredRows: number;
  conflictRows: number;
  issues: ImportIssue[];
  issuesTruncated: boolean;
}

export interface ImportBatch {
  id: string;
  batchId?: string;
  fileName: string;
  fileChecksum: string;
  scopeFingerprint: string;
  scope: ImportScope;
  status: string;
  totalRows: number;
  rowsInScope: number;
  rowsExcludedByScope: number;
  newPatients: number;
  updatedPatients: number;
  unchangedPatients: number;
  newAppointments: number;
  rescheduledAppointments: number;
  errorRows: number;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportAccepted {
  batchId: string;
  fileName: string;
  fileChecksum: string;
  scopeFingerprint: string;
  scope: ImportScope;
}

@Injectable({ providedIn: 'root' })
export class ImportsRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  list(page = 0, size = 20): Observable<PageResponse<ImportBatch>> {
    return this.http.get<PageResponse<ImportBatch>>(apiUrl(this.config, '/api/cred/imports'), {
      params: paramsFrom({ page, size }),
    });
  }

  get(id: string): Observable<ImportBatch> {
    return this.http.get<ImportBatch>(apiUrl(this.config, `/api/cred/imports/${id}`));
  }

  scopes(file: File): Observable<ImportScopesResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportScopesResponse>(apiUrl(this.config, '/api/cred/imports/scopes'), formData);
  }

  preview(file: File, scope: ImportScope): Observable<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportPreview>(apiUrl(this.config, '/api/cred/imports/preview'), formData, {
      params: scopeParams(scope),
    });
  }

  apply(file: File, preview: ImportPreview): Observable<ImportAccepted> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expectedChecksum', preview.fileChecksum);
    formData.append('expectedScopeFingerprint', preview.scopeFingerprint);
    return this.http.post<ImportAccepted>(apiUrl(this.config, '/api/cred/imports/apply'), formData, {
      params: scopeParams(preview.scope),
    });
  }
}

function scopeParams(scope: ImportScope): HttpParams {
  return paramsFrom({
    red: scope.red ?? undefined,
    microred: scope.microred ?? undefined,
    establishment: scope.establishment ?? undefined,
  });
}

function paramsFrom(filters: Record<string, string | number | boolean | null | undefined>): HttpParams {
  return Object.entries(filters).reduce((params, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return params;
    }

    return params.set(key, String(value));
  }, new HttpParams());
}
