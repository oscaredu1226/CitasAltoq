import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../../core/config/api.config';
import { HttpEventType } from '@angular/common/http';
import { ImportPreview, ImportsRepository } from './imports.repository';

describe('ImportsRepository', () => {
  it('uses preview checksum, scope fingerprint and authoritative roster flag when applying an import', () => {
    TestBed.configureTestingModule({
      providers: [
        ImportsRepository,
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const repo = TestBed.inject(ImportsRepository);
    const controller = TestBed.inject(HttpTestingController);
    const file = new File(['x'], 'cred.xlsx');
    const preview = { fileChecksum: 'checksum', scopeFingerprint: 'scope-fingerprint' } as ImportPreview;

    repo.apply(file, preview, { red: 'Red', microred: 'Microred', establishment: 'Centro' }, true).subscribe();

    const request = controller.expectOne((req) => req.url === 'https://api.example.test/api/cred/imports/apply');
    expect(request.request.params.get('red')).toBe('Red');
    expect(request.request.params.get('microred')).toBe('Microred');
    expect(request.request.params.get('establishment')).toBe('Centro');
    expect(request.request.params.get('authoritativeRoster')).toBe('true');
    const body = request.request.body as FormData;
    expect(body.get('expectedChecksum')).toBe('checksum');
    expect(body.get('expectedScopeFingerprint')).toBe('scope-fingerprint');
    controller.verify();
  });

  it('defaults apply to non-authoritative roster without scope params', () => {
    TestBed.configureTestingModule({
      providers: [
        ImportsRepository,
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const repo = TestBed.inject(ImportsRepository);
    const controller = TestBed.inject(HttpTestingController);
    const file = new File(['x'], 'cred.xlsx');
    const preview = { fileChecksum: 'checksum', scopeFingerprint: 'scope-fingerprint' } as ImportPreview;

    repo.apply(file, preview).subscribe();

    const request = controller.expectOne((req) => req.url === 'https://api.example.test/api/cred/imports/apply');
    expect(request.request.params.keys()).toEqual(['authoritativeRoster']);
    expect(request.request.params.get('authoritativeRoster')).toBe('false');
    controller.verify();
  });

  it('emits real upload progress before preview response', () => {
    TestBed.configureTestingModule({
      providers: [
        ImportsRepository,
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const repo = TestBed.inject(ImportsRepository);
    const controller = TestBed.inject(HttpTestingController);
    const events: unknown[] = [];

    repo.previewEvents(new File(['x'], 'cred.xlsx'), { establishment: 'Centro' }).subscribe((event) => events.push(event));

    const request = controller.expectOne((req) => req.url === 'https://api.example.test/api/cred/imports/preview');
    expect(request.request.reportProgress).toBe(true);
    expect(request.request.params.get('establishment')).toBe('Centro');
    request.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    request.flush({ fileChecksum: 'checksum', scopeFingerprint: 'scope', scope: { red: 'Red', microred: 'Microred', establishment: 'Centro' } });

    expect(events).toContainEqual({ type: 'progress', progress: 50 });
    expect(events).toContainEqual(expect.objectContaining({ type: 'response' }));
    controller.verify();
  });
});
