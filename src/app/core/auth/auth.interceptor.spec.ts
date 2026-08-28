import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../config/api.config';
import { SessionStore } from './session.store';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  it('adds Bearer token to API requests except login', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const store = TestBed.inject(SessionStore);
    store.setSession({ accessToken: 'abc', expiresAt: Date.now() + 1000, remember: false });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('https://api.example.test/api/me').subscribe();
    expect(controller.expectOne('https://api.example.test/api/me').request.headers.get('Authorization')).toBe('Bearer abc');

    http.post('https://api.example.test/api/auth/login', {}).subscribe();
    expect(controller.expectOne('https://api.example.test/api/auth/login').request.headers.has('Authorization')).toBe(false);
    controller.verify();
  });
});
