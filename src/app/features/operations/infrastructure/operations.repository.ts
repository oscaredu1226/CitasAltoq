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

export type ReminderAudienceMode = 'SELECTED' | 'ALL';

export interface ReminderAudienceEstablishment {
  id: number;
  name: string;
  active: boolean;
  microredId: number;
  microredName: string;
  redId: number;
  redName: string;
}

export interface ReminderAudience {
  mode: ReminderAudienceMode;
  selectedEstablishments: ReminderAudienceEstablishment[];
  updatedAt: string;
}

export interface UpdateReminderAudienceRequest {
  mode: ReminderAudienceMode;
  establishmentIds: number[];
}

@Injectable({ providedIn: 'root' })
export class OperationsRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  status(): Observable<OperationsStatus> {
    return this.http.get<OperationsStatus>(apiUrl(this.config, '/api/cred/operations/status'));
  }

  reminderAudience(): Observable<ReminderAudience> {
    return this.http.get<ReminderAudience>(apiUrl(this.config, '/api/admin/cred-reminder-audience'));
  }

  updateReminderAudience(request: UpdateReminderAudienceRequest): Observable<ReminderAudience> {
    return this.http.put<ReminderAudience>(apiUrl(this.config, '/api/admin/cred-reminder-audience'), request);
  }
}
