import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../../core/config/api.config';
import { ImportPreview, ImportsRepository } from './imports.repository';

describe('ImportsRepository', () => {
  it('uses preview checksum and scope fingerprint when applying an import', () => {
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
    const preview = {
      fileChecksum: 'checksum',
      scopeFingerprint: 'scope-fingerprint',
      scope: { red: 'Red', microred: 'Micro', establishment: 'Centro' },
    } as ImportPreview;

    repo.apply(file, preview).subscribe();

    const request = controller.expectOne((req) => req.url === 'https://api.example.test/api/cred/imports/apply');
    expect(request.request.params.get('red')).toBe('Red');
    expect(request.request.params.get('microred')).toBe('Micro');
    expect(request.request.params.get('establishment')).toBe('Centro');
    const body = request.request.body as FormData;
    expect(body.get('expectedChecksum')).toBe('checksum');
    expect(body.get('expectedScopeFingerprint')).toBe('scope-fingerprint');
    controller.verify();
  });
});
