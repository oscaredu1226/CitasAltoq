import { inject, Injectable } from '@angular/core';
import { OrganizationStore } from './organization.store';

@Injectable({ providedIn: 'root' })
export class OrganizationFacade {
  private readonly store = inject(OrganizationStore);

  readonly establishments = this.store.establishments;
  readonly microreds = this.store.microreds;
  readonly reds = this.store.reds;
  readonly loading = this.store.loading;
  readonly loaded = this.store.loaded;
  readonly error = this.store.error;

  load(force = false): void {
    this.store.load(force);
  }

  invalidate(): void {
    this.store.invalidate();
  }
}
