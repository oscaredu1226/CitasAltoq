import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../../core/config/api.config';
import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UsersRepository,
        { provide: API_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test' } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('creates establishment operators with establishmentId', () => {
    const repo = TestBed.inject(UsersRepository);
    const controller = TestBed.inject(HttpTestingController);

    repo.createOperator({ displayName: 'Operador', email: 'op@example.test', password: 'password123', establishmentId: 123 }).subscribe();

    const request = controller.expectOne('https://api.example.test/api/admin/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      displayName: 'Operador',
      email: 'op@example.test',
      password: 'password123',
      establishmentId: 123,
    });
  });

  it('creates admins without establishment data', () => {
    const repo = TestBed.inject(UsersRepository);
    const controller = TestBed.inject(HttpTestingController);

    repo.createAdmin({ displayName: 'Admin', email: 'admin@example.test', password: 'password123' }).subscribe();

    const request = controller.expectOne('https://api.example.test/api/admin/users/admins');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      displayName: 'Admin',
      email: 'admin@example.test',
      password: 'password123',
    });
  });
});
