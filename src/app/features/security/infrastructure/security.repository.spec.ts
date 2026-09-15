import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../../core/config/api.config';
import { SecurityRepository } from './security.repository';

describe('SecurityRepository', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  }));

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('requests filtered events without sending sensitive local data', () => {
    const repository = TestBed.inject(SecurityRepository);
    const http = TestBed.inject(HttpTestingController);

    repository.events({ type: 'LOGIN_FALLIDO', outcome: 'FALLO', hours: 24, page: 0, size: 25 }).subscribe();

    const request = http.expectOne((candidate) => candidate.url.endsWith('/api/admin/security/events'));
    expect(request.request.params.get('type')).toBe('LOGIN_FALLIDO');
    expect(request.request.params.get('outcome')).toBe('FALLO');
    expect(request.request.params.get('hours')).toBe('24');
    request.flush({ content: [], page: 0, size: 25, totalElements: 0, totalPages: 0 });
  });
});
