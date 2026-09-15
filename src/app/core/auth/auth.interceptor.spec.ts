import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_CONFIG } from '../config/api.config';
import { SessionStore } from './session.store';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  it('adds Bearer token to API requests except login', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideRouter([]),
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

  it('adds Bearer token to relative API requests in development', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: { apiBaseUrl: '' } },
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const store = TestBed.inject(SessionStore);
    store.setSession({ accessToken: 'abc', expiresAt: Date.now() + 1000, remember: false });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('/api/me').subscribe();
    expect(controller.expectOne('/api/me').request.headers.get('Authorization')).toBe('Bearer abc');
    controller.verify();
  });

  it('does not leak Bearer token to external or lookalike URLs', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const store = TestBed.inject(SessionStore);
    store.setSession({ accessToken: 'abc', expiresAt: Date.now() + 1000, remember: false });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('https://api.example.test.evil/api/me').subscribe();
    expect(controller.expectOne('https://api.example.test.evil/api/me').request.headers.has('Authorization')).toBe(false);

    http.get('https://analytics.example.test/api/event').subscribe();
    expect(controller.expectOne('https://analytics.example.test/api/event').request.headers.has('Authorization')).toBe(false);
    controller.verify();
  });

  it('keeps the session when the API is temporarily rate limited', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const store = TestBed.inject(SessionStore);
    store.setSession({ accessToken: 'abc', expiresAt: Date.now() + 1000, remember: false });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('https://api.example.test/api/me').subscribe({ error: () => undefined });
    controller.expectOne('https://api.example.test/api/me').flush(null, { status: 429, statusText: 'Too Many Requests' });

    expect(store.token()).toBe('abc');
    controller.verify();
  });

  it('clears the session and redirects only after a real unauthorized response', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const store = TestBed.inject(SessionStore);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    store.setSession({ accessToken: 'abc', expiresAt: Date.now() + 1000, remember: false });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('https://api.example.test/api/me').subscribe({ error: () => undefined });
    controller.expectOne('https://api.example.test/api/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(store.token()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
    controller.verify();
  });
});
