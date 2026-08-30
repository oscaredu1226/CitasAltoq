import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideChevronDown, LucideSearch, LucideX } from '@lucide/angular';

export interface OrganizationDropdownOption {
  id: string;
  title: string;
  subtitle?: string;
  disabled?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideChevronDown, LucideSearch, LucideX],
  selector: 'app-organization-dropdown',
  templateUrl: './organization-dropdown.component.html',
  styleUrl: './organization-dropdown.component.css',
})
export class OrganizationDropdownComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly label = input.required<string>();
  readonly placeholder = input('Seleccionar');
  readonly searchPlaceholder = input('Buscar...');
  readonly emptyText = input('No hay opciones disponibles.');
  readonly loading = input(false);
  readonly error = input('');
  readonly disabled = input(false);
  readonly options = input<OrganizationDropdownOption[]>([]);
  readonly selectedId = input('');
  readonly selectedIdChange = output<string>();
  readonly retry = output<void>();

  readonly open = signal(false);
  readonly search = signal('');
  readonly activeIndex = signal(0);
  readonly selected = computed(() => this.options().find((option) => option.id === this.selectedId()) ?? null);
  readonly filtered = computed(() => {
    const term = this.search().trim().toLocaleLowerCase('es-PE');
    const options = this.options();
    if (!term) {
      return options;
    }

    return options.filter((option) => `${option.title} ${option.subtitle ?? ''}`.toLocaleLowerCase('es-PE').includes(term));
  });

  toggle(): void {
    if (this.disabled()) {
      return;
    }

    this.open.update((value) => !value);
    this.activeIndex.set(0);
  }

  choose(option: OrganizationDropdownOption): void {
    if (option.disabled) {
      return;
    }

    this.selectedIdChange.emit(option.id);
    this.open.set(false);
    this.search.set('');
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedIdChange.emit('');
    this.search.set('');
  }

  keydown(event: KeyboardEvent): void {
    if (!this.open() && ['ArrowDown', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      this.open.set(true);
      return;
    }

    if (event.key === 'Escape') {
      this.open.set(false);
      return;
    }

    const options = this.filtered();
    if (!options.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((index) => Math.min(index + 1, options.length - 1));
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((index) => Math.max(index - 1, 0));
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.choose(options[this.activeIndex()]);
    }
  }

  @HostListener('document:click', ['$event'])
  closeFromOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
