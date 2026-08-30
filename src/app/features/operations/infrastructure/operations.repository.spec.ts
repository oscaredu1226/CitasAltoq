import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../../core/config/api.config';
import { OperationsRepository } from './operations.repository';

describe('OperationsRepository', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OperationsRepository,
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  it('loads and updates the CRED reminder audience', () => {
    const repository = TestBed.inject(OperationsRepository);
    const http = TestBed.inject(HttpTestingController);

    repository.reminderAudience().subscribe();
    http.expectOne('https://api.example.test/api/admin/cred-reminder-audience')
      .flush({ mode: 'SELECTED', selectedEstablishments: [], updatedAt: '2026-08-30T12:00:00Z' });

    repository.updateReminderAudience({ mode: 'SELECTED', establishmentIds: [7] }).subscribe();
    const update = http.expectOne('https://api.example.test/api/admin/cred-reminder-audience');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ mode: 'SELECTED', establishmentIds: [7] });
    update.flush({ mode: 'SELECTED', selectedEstablishments: [], updatedAt: '2026-08-30T12:01:00Z' });
    http.verify();
  });
});
