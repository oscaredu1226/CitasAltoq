import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isAdmin } from '../../../core/auth/auth.models';
import { formatDateOnly } from '../../../shared/utils/date-only';
import { statusView } from '../../../shared/utils/status-mappers';
import { PageTitleComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { ContactsRepository, Contact } from '../../contacts/infrastructure/contacts.repository';
import { Patient, PatientAppointment, PatientsRepository } from '../infrastructure/patients.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideArrowLeft, PageTitleComponent, RouterLink, StatusBadgeComponent],
  templateUrl: './patient-detail.page.html',
  styleUrl: './patient-detail.page.css',
})
export class PatientDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly patients = inject(PatientsRepository);
  private readonly contacts = inject(ContactsRepository);
  private readonly auth = inject(AuthFacade);

  readonly patient = signal<Patient | null>(null);
  readonly contact = signal<Contact | null>(null);
  readonly appointments = signal<PatientAppointment[]>([]);
  readonly admin = computed(() => isAdmin(this.auth.session.user()));

  constructor() {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id')!;
        return forkJoin({
          patient: this.patients.get(id),
          appointments: this.patients.appointments(id, 0, 8).pipe(catchError(() => of({ content: [] }))),
        });
      }),
      switchMap(({ patient, appointments }) => {
        this.patient.set(patient);
        this.appointments.set(appointments.content as PatientAppointment[]);
        if (patient.guardianContactId && this.admin()) {
          return this.contacts.get(patient.guardianContactId).pipe(catchError(() => of(null)));
        }
        return of(null);
      }),
    ).subscribe((contact) => this.contact.set(contact));
  }

  formatDate = formatDateOnly;
  statusView = statusView;

  shortId(value: string): string {
    return value.slice(0, 8);
  }

  origin(appointment: PatientAppointment): string {
    if (appointment.rescheduledFromAppointmentId) {
      return 'Reprogramación';
    }
    return appointment.sourceImportBatchId ? 'Importación CRED' : 'Sistema';
  }
}
