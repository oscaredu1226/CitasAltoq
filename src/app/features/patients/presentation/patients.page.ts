import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageResponse } from '../../../core/http/page-response';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { formatDateOnly } from '../../../shared/utils/date-only';
import { AlertComponent, EmptyStateComponent, PageTitleComponent, PaginationComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { Patient, PatientsRepository } from '../infrastructure/patients.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, EmptyStateComponent, PageTitleComponent, PaginationComponent, ReactiveFormsModule, RouterLink, StatusBadgeComponent],
  templateUrl: './patients.page.html',
  styleUrl: './patients.page.css',
})
export class PatientsPage {
  private readonly repo = inject(PatientsRepository);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly requestId = signal<string | undefined>(undefined);
  readonly page = signal<PageResponse<Patient> | null>(null);
  readonly form = this.fb.nonNullable.group({
    documentNumber: [''],
    name: [''],
    clinicalHistory: [''],
    active: [''],
  });
  readonly filtered = computed(() => {
    const page = this.page();
    const name = this.form.controls.name.value.trim().toLocaleLowerCase('es-PE');
    const content = page?.content ?? [];
    return name ? content.filter((patient) => patient.name.toLocaleLowerCase('es-PE').includes(name)) : content;
  });

  constructor() {
    const documentNumber = this.route.snapshot.queryParamMap.get('documentNumber') ?? '';
    this.form.patchValue({ documentNumber });
    this.load(0);
  }

  load(page: number): void {
    if (page < 0) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const raw = this.form.getRawValue();
    this.repo.list({
      documentNumber: raw.documentNumber,
      clinicalHistory: raw.clinicalHistory,
      active: raw.active === '' ? null : raw.active === 'true',
      page,
      size: 10,
    }).subscribe({
      next: (response) => this.page.set(response),
      error: (err) => {
        const mapped = mapApiError(err);
        this.error.set(mapped.message);
        this.requestId.set(mapped.requestId);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  clear(): void {
    this.form.reset({ documentNumber: '', name: '', clinicalHistory: '', active: '' });
    this.load(0);
  }

  formatDate = formatDateOnly;
}
