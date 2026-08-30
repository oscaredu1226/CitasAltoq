import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_CONFIG, apiUrl } from '../../../core/config/api.config';
import { Establishment, EstablishmentCatalogResponse } from '../domain/organization.models';

@Injectable({ providedIn: 'root' })
export class OrganizationRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  establishments(): Observable<Establishment[]> {
    return this.http.get<Establishment[] | EstablishmentCatalogResponse>(apiUrl(this.config, '/api/admin/establishments')).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response.map(normalizeEstablishment);
        }

        return (response.content ?? response.establishments ?? []).map(normalizeEstablishment);
      }),
    );
  }
}

function normalizeEstablishment(establishment: Establishment): Establishment {
  return {
    ...establishment,
    id: String(establishment.id),
    microred: {
      ...establishment.microred,
      id: String(establishment.microred?.id ?? ''),
    },
    red: {
      ...establishment.red,
      id: String(establishment.red?.id ?? ''),
    },
  };
}
