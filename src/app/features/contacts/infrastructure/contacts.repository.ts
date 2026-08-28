import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';
import { PageResponse } from '../../../core/http/page-response';

export type ConsentStatus = 'UNKNOWN' | 'OPTED_IN' | 'OPTED_OUT';

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  active: boolean;
  whatsAppConsentStatus: ConsentStatus;
  whatsAppConsentUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ContactsRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  list(page = 0, size = 20): Observable<PageResponse<Contact>> {
    return this.http.get<PageResponse<Contact>>(apiUrl(this.config, '/api/contacts'), {
      params: { page, size },
    });
  }

  get(id: string): Observable<Contact> {
    return this.http.get<Contact>(apiUrl(this.config, `/api/contacts/${id}`));
  }

  create(payload: Pick<Contact, 'name' | 'phoneNumber'>): Observable<Contact> {
    return this.http.post<Contact>(apiUrl(this.config, '/api/contacts'), payload);
  }

  update(id: string, payload: Pick<Contact, 'name' | 'phoneNumber' | 'active'>): Observable<Contact> {
    return this.http.put<Contact>(apiUrl(this.config, `/api/contacts/${id}`), payload);
  }

  deactivate(id: string): Observable<Contact> {
    return this.http.patch<Contact>(apiUrl(this.config, `/api/contacts/${id}/deactivate`), {});
  }

  updateConsent(id: string, status: ConsentStatus): Observable<Contact> {
    return this.http.put<Contact>(apiUrl(this.config, `/api/contacts/${id}/whatsapp-consent`), { status });
  }
}
