import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { Establishment } from '../../domain/organization.models';
import { OrganizationStore } from '../../application/organization.store';
import { OrganizationDropdownComponent, OrganizationDropdownOption } from '../organization-dropdown/organization-dropdown.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OrganizationDropdownComponent],
  selector: 'app-establishment-select',
  templateUrl: './establishment-select.component.html',
  styleUrl: './establishment-select.component.css',
})
export class EstablishmentSelectComponent {
  private readonly store = inject(OrganizationStore);

  readonly selectedId = input('');
  readonly redId = input<string | null>(null);
  readonly microredId = input<string | null>(null);
  readonly disabled = input(false);
  readonly label = input('Establecimiento');
  readonly selectedIdChange = output<string>();

  readonly establishments = this.store.establishments;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly filtered = computed(() => {
    const redId = this.redId();
    const microredId = this.microredId();
    return this.establishments()
      .filter((establishment) => !redId || establishment.red?.id === redId)
      .filter((establishment) => !microredId || establishment.microred?.id === microredId);
  });
  readonly options = computed<OrganizationDropdownOption[]>(() => this.filtered().map((establishment) => ({
    id: establishment.id,
    title: establishment.name,
    subtitle: [establishment.microred?.name, establishment.red?.name].filter(Boolean).join(' · '),
  })));
  readonly selected = computed(() => this.establishments().find((item) => item.id === this.selectedId()) ?? null);

  constructor() {
    this.store.load();
    effect(() => {
      const redId = this.redId();
      const microredId = this.microredId();
      const selected = this.selected();
      if (selected && ((redId && selected.red?.id !== redId) || (microredId && selected.microred?.id !== microredId))) {
        this.selectedIdChange.emit('');
      }
    });
  }

  choose(id: string): void {
    this.selectedIdChange.emit(id);
  }

  retry(): void {
    this.store.load(true);
  }
}
