import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../config/api.config';
import { mfaInterceptor } from './mfa.interceptor';
import { MfaStore } from './mfa.store';

describe('mfaInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideHttpClient(withInterceptors([mfaInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('adds X-MFA-Token to sensitive admin requests only', () => {
    TestBed.inject(MfaStore).setElevation({ mfaToken: 'mfa-token', expiresAt: new Date(Date.now() + 60_000).toISOString() });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('https://api.example.test/api/admin/users').subscribe();
    expect(controller.expectOne('https://api.example.test/api/admin/users').request.headers.has('X-MFA-Token')).toBe(false);

    http.post('https://api.example.test/api/admin/users', {}).subscribe();
    expect(controller.expectOne('https://api.example.test/api/admin/users').request.headers.get('X-MFA-Token')).toBe('mfa-token');

    http.put('https://api.example.test/api/admin/cred-reminder-audience', {}).subscribe();
    expect(controller.expectOne('https://api.example.test/api/admin/cred-reminder-audience').request.headers.get('X-MFA-Token')).toBe('mfa-token');

    http.get('https://api.example.test/api/admin/security/events').subscribe();
    expect(controller.expectOne('https://api.example.test/api/admin/security/events').request.headers.get('X-MFA-Token')).toBe('mfa-token');

    http.get('https://api.example.test/api/admin/daily-reports/subscriptions').subscribe();
    expect(controller.expectOne('https://api.example.test/api/admin/daily-reports/subscriptions').request.headers.get('X-MFA-Token')).toBe('mfa-token');

    http.get('https://api.example.test/api/admin/daily-reports/subscriptions/candidates').subscribe();
    expect(controller.expectOne('https://api.example.test/api/admin/daily-reports/subscriptions/candidates').request.headers.get('X-MFA-Token')).toBe('mfa-token');

    http.post('https://api.example.test/api/admin/daily-reports/subscriptions/report-id/send-now', {}).subscribe();
    expect(controller.expectOne('https://api.example.test/api/admin/daily-reports/subscriptions/report-id/send-now').request.headers.get('X-MFA-Token')).toBe('mfa-token');
  });

  it('does not leak X-MFA-Token to external URLs', () => {
    TestBed.inject(MfaStore).setElevation({ mfaToken: 'mfa-token', expiresAt: new Date(Date.now() + 60_000).toISOString() });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.put('https://api.example.test.evil/api/admin/users/1', {}).subscribe();
    expect(controller.expectOne('https://api.example.test.evil/api/admin/users/1').request.headers.has('X-MFA-Token')).toBe(false);
  });
});
