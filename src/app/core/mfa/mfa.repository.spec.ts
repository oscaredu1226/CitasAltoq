import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../config/api.config';
import { MfaRepository } from './mfa.repository';

describe('MfaRepository', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MfaRepository,
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('starts setup with password only', () => {
    const repo = TestBed.inject(MfaRepository);
    const controller = TestBed.inject(HttpTestingController);

    repo.setup('current-password').subscribe();

    const request = controller.expectOne('https://api.example.test/api/me/mfa/setup');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ password: 'current-password' });
  });

  it('verifies totp codes and locks the MFA elevation', () => {
    const repo = TestBed.inject(MfaRepository);
    const controller = TestBed.inject(HttpTestingController);

    repo.verify('123456').subscribe();
    const verify = controller.expectOne('https://api.example.test/api/me/mfa/verify');
    expect(verify.request.body).toEqual({ code: '123456' });

    repo.lock().subscribe();
    const lock = controller.expectOne('https://api.example.test/api/me/mfa/lock');
    expect(lock.request.method).toBe('POST');
  });
});
