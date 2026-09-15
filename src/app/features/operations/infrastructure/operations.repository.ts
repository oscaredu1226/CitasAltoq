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

export interface DailyReportSubscription {
  id: string;
  userId: string;
  establishmentId: number;
  recipientEmail: string;
  active: boolean;
  userDisplayName: string;
  userEmail: string;
  establishmentName: string;
  microredName: string;
  redName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDailyReportSubscriptionRequest {
  userId: string;
  recipientEmail: string;
}

export interface DailyReportCandidate {
  userId: string;
  userDisplayName: string;
  userEmail: string;
  establishmentId: number;
  establishmentName: string;
  microredName: string;
  redName: string;
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

  dailyReportSubscriptions(): Observable<DailyReportSubscription[]> {
    return this.http.get<DailyReportSubscription[]>(apiUrl(this.config, '/api/admin/daily-reports/subscriptions'));
  }

  dailyReportCandidates(): Observable<DailyReportCandidate[]> {
    return this.http.get<DailyReportCandidate[]>(apiUrl(this.config, '/api/admin/daily-reports/subscriptions/candidates'));
  }

  createDailyReportSubscription(request: CreateDailyReportSubscriptionRequest): Observable<DailyReportSubscription> {
    return this.http.post<DailyReportSubscription>(apiUrl(this.config, '/api/admin/daily-reports/subscriptions'), request);
  }

  updateDailyReportSubscription(subscription: Pick<DailyReportSubscription, 'id' | 'recipientEmail' | 'active'>): Observable<DailyReportSubscription> {
    return this.http.put<DailyReportSubscription>(
      apiUrl(this.config, `/api/admin/daily-reports/subscriptions/${subscription.id}`),
      { recipientEmail: subscription.recipientEmail, active: subscription.active },
    );
  }

  deleteDailyReportSubscription(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(this.config, `/api/admin/daily-reports/subscriptions/${id}`));
  }

  sendDailyReportTest(id: string): Observable<void> {
    return this.http.post<void>(apiUrl(this.config, `/api/admin/daily-reports/subscriptions/${id}/test`), {});
  }
}
