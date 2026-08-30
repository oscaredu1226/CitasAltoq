import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationRepository } from '../infrastructure/organization.repository';
import { OrganizationStore } from './organization.store';

describe('OrganizationStore', () => {
  it('derives Reds and Microreds from the establishment catalog', () => {
    TestBed.configureTestingModule({
      providers: [
        OrganizationStore,
        {
          provide: OrganizationRepository,
          useValue: {
            establishments: () => of([
              {
                id: 'est-1',
                name: 'Centro Uno',
                microred: { id: 'micro-1', name: 'Microred Uno' },
                red: { id: 'red-1', name: 'Red Uno' },
              },
              {
                id: 'est-2',
                name: 'Centro Dos',
                microred: { id: 'micro-2', name: 'Microred Dos' },
                red: { id: 'red-1', name: 'Red Uno' },
              },
            ]),
          },
        },
      ],
    });

    const store = TestBed.inject(OrganizationStore);
    store.load();

    expect(store.reds()).toEqual([{ id: 'red-1', name: 'Red Uno' }]);
    expect(store.microreds()).toEqual([
      { id: 'micro-2', name: 'Microred Dos', red: { id: 'red-1', name: 'Red Uno' } },
      { id: 'micro-1', name: 'Microred Uno', red: { id: 'red-1', name: 'Red Uno' } },
    ]);
  });
});
