import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { Establishment, MicroredSummary, RedSummary } from '../domain/organization.models';
import { OrganizationRepository } from '../infrastructure/organization.repository';

@Injectable({ providedIn: 'root' })
export class OrganizationStore {
  private readonly repository = inject(OrganizationRepository);
  private readonly loadedState = signal(false);

  readonly establishments = signal<Establishment[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly loaded = this.loadedState.asReadonly();
  readonly reds = computed<RedSummary[]>(() => {
    const byId = new Map<string, RedSummary>();
    for (const establishment of this.establishments()) {
      if (establishment.red?.id) {
        byId.set(establishment.red.id, establishment.red);
      }
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'es-PE'));
  });
  readonly microreds = computed<MicroredSummary[]>(() => {
    const byId = new Map<string, MicroredSummary>();
    for (const establishment of this.establishments()) {
      if (establishment.microred?.id) {
        byId.set(establishment.microred.id, { ...establishment.microred, red: establishment.red });
      }
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'es-PE'));
  });
  load(force = false): void {
    if ((this.loadedState() || this.loading()) && !force) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.repository.establishments().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (establishments) => {
        this.loadedState.set(true);
        this.establishments.set(establishments);
      },
      error: (err) => {
        const mapped = mapApiError(err);
        this.error.set(mapped.message);
      },
    });
  }

  invalidate(): void {
    this.loadedState.set(false);
    this.establishments.set([]);
  }
}
