import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';

export interface OperationsStatus {
  whatsAppEnabled: boolean;
  reminderSchedulerEnabled: boolean;
  credSyncEnabled: boolean;
  credTemplateEnabled: boolean;
  credDispatchEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class OperationsRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  status(): Observable<OperationsStatus> {
    return this.http.get<OperationsStatus>(apiUrl(this.config, '/api/cred/operations/status'));
  }
}
