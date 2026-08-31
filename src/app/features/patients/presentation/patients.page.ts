import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isAdmin } from '../../../core/auth/auth.models';
import { PageResponse } from '../../../core/http/page-response';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { newestFirstPage } from '../../../core/http/newest-page';
import { formatDateOnly } from '../../../shared/utils/date-only';
import { AlertComponent, EmptyStateComponent, PageTitleComponent, PaginationComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { OrganizationStore } from '../../organization/application/organization.store';
import { Establishment } from '../../organization/domain/organization.models';
import { EstablishmentSelectComponent } from '../../organization/presentation/establishment-select/establishment-select.component';
import { OrganizationDropdownComponent, OrganizationDropdownOption } from '../../organization/presentation/organization-dropdown/organization-dropdown.component';
import { Patient, PatientsRepository } from '../infrastructure/patients.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    EstablishmentSelectComponent,
    OrganizationDropdownComponent,
    PageTitleComponent,
    PaginationComponent,
    ReactiveFormsModule,
    RouterLink,
    StatusBadgeComponent,
  ],
  templateUrl: './patients.page.html',
  styleUrl: './patients.page.css',
})
export class PatientsPage {
  private readonly repo = inject(PatientsRepository);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthFacade);
  private readonly organization = inject(OrganizationStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly requestId = signal<string | undefined>(undefined);
  readonly page = signal<PageResponse<Patient> | null>(null);
  readonly admin = computed(() => isAdmin(this.auth.session.user()));
  readonly reds = this.organization.reds;
  readonly redOptions = computed<OrganizationDropdownOption[]>(() => this.reds().map((red) => ({ id: red.id, title: red.name })));
  readonly form = this.fb.nonNullable.group({
    documentNumber: [''],
    name: [''],
    clinicalHistory: [''],
    active: [''],
    redId: [''],
    microredId: [''],
    establishmentId: [''],
  });
  readonly filtered = computed(() => {
    const page = this.page();
    const name = this.form.controls.name.value.trim().toLocaleLowerCase('es-PE');
    const content = page?.content ?? [];
    return name ? content.filter((patient) => patient.name.toLocaleLowerCase('es-PE').includes(name)) : content;
  });

  constructor() {
    this.organization.load();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const documentNumber = params.get('documentNumber') ?? '';
      if (this.form.controls.documentNumber.value !== documentNumber) {
        this.form.patchValue({ documentNumber });
      }
      this.load(0);
    });
  }

  load(page: number): void {
    if (page < 0) {
      return;
    }

    if (!this.filtersValid()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const raw = this.form.getRawValue();
    const establishment = this.selectedEstablishment();
    const microred = this.organization.microreds().find((item) => item.id === raw.microredId) ?? null;
    const red = this.reds().find((item) => item.id === raw.redId) ?? null;
    const filters = {
      documentNumber: raw.documentNumber,
      clinicalHistory: raw.clinicalHistory,
      red: this.admin() ? establishment?.red?.name ?? red?.name : undefined,
      microred: this.admin() ? establishment?.microred?.name ?? microred?.name : undefined,
      establishment: this.admin() ? establishment?.name : undefined,
      active: raw.active === '' ? null : raw.active === 'true',
    };
    newestFirstPage(page, 10, (serverPage, size) => this.repo.list({ ...filters, page: serverPage, size })).subscribe({
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
    this.form.reset({ documentNumber: '', name: '', clinicalHistory: '', active: '', redId: '', microredId: '', establishmentId: '' });
    this.load(0);
  }

  selectRed(redId: string): void {
    this.form.controls.redId.setValue(redId);
    this.form.controls.microredId.setValue('');
    this.form.controls.establishmentId.setValue('');
  }

  selectMicrored(microredId: string): void {
    this.form.controls.microredId.setValue(microredId);
    this.form.controls.establishmentId.setValue('');
  }

  microredOptions(): OrganizationDropdownOption[] {
    const redId = this.form.controls.redId.value;
    return this.organization.microreds()
      .filter((microred) => !redId || microred.red?.id === redId)
      .map((microred) => ({
        id: microred.id,
        title: microred.name,
        subtitle: microred.red?.name,
      }));
  }

  selectedEstablishment(): Establishment | null {
    const establishmentId = this.form.controls.establishmentId.value;
    return this.organization.establishments().find((item) => item.id === establishmentId) ?? null;
  }

  private filtersValid(): boolean {
    const raw = this.form.getRawValue();
    const documentNumber = raw.documentNumber.trim();

    if (documentNumber && !/^\d+$/.test(documentNumber)) {
      this.error.set('El documento debe contener solo números.');
      this.requestId.set(undefined);
      return false;
    }

    if (raw.microredId && raw.redId && !this.microredOptions().some((microred) => microred.id === raw.microredId)) {
      this.error.set('La Microred seleccionada no pertenece a la Red elegida.');
      this.requestId.set(undefined);
      return false;
    }

    if (raw.establishmentId && !this.selectedEstablishment()) {
      this.error.set('El establecimiento seleccionado ya no está disponible. Vuelve a seleccionarlo.');
      this.requestId.set(undefined);
      return false;
    }

    return true;
  }

  formatDate = formatDateOnly;
}
