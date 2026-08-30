import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../../core/config/api.config';
import { OrganizationRepository } from './organization.repository';

describe('OrganizationRepository', () => {
  it('loads the establishment catalog', () => {
    TestBed.configureTestingModule({
      providers: [
        OrganizationRepository,
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const repo = TestBed.inject(OrganizationRepository);
    const controller = TestBed.inject(HttpTestingController);
    const result: unknown[] = [];

    repo.establishments().subscribe((items) => result.push(items));

    const request = controller.expectOne('https://api.example.test/api/admin/establishments');
    request.flush([{ id: 1, name: 'C.S. Misti', microred: { id: 2, name: 'Microred Misti' }, red: { id: 3, name: 'Red Arequipa' } }]);

    expect(result).toEqual([[{
      id: '1',
      name: 'C.S. Misti',
      microred: { id: '2', name: 'Microred Misti' },
      red: { id: '3', name: 'Red Arequipa' },
    }]]);
    controller.verify();
  });
});
