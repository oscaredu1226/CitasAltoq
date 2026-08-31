import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../config/api.config';
import { requestTracingInterceptor } from './request-tracing.interceptor';

describe('requestTracingInterceptor', () => {
  it('adds request id only to configured API requests', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideHttpClient(withInterceptors([requestTracingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('https://api.example.test/api/me').subscribe();
    expect(controller.expectOne('https://api.example.test/api/me').request.headers.has('X-Request-ID')).toBe(true);

    http.get('https://api.example.test.evil/api/me').subscribe();
    expect(controller.expectOne('https://api.example.test.evil/api/me').request.headers.has('X-Request-ID')).toBe(false);
    controller.verify();
  });

  it('supports relative API requests when no API base URL is configured', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: { apiBaseUrl: '' } },
        provideHttpClient(withInterceptors([requestTracingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('/api/me').subscribe();
    expect(controller.expectOne('/api/me').request.headers.has('X-Request-ID')).toBe(true);

    http.get('/assets/logo_altoq.png').subscribe();
    expect(controller.expectOne('/assets/logo_altoq.png').request.headers.has('X-Request-ID')).toBe(false);
    controller.verify();
  });
});
