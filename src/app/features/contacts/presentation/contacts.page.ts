import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageResponse } from '../../../core/http/page-response';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { formatOffsetDateTime } from '../../../shared/utils/date-only';
import { maskPhone } from '../../../shared/utils/phone';
import { AlertComponent, EmptyStateComponent, FieldErrorComponent, PageTitleComponent, PaginationComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import { ConsentStatus, Contact, ContactsRepository } from '../infrastructure/contacts.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, EmptyStateComponent, FieldErrorComponent, PageTitleComponent, PaginationComponent, ReactiveFormsModule, StatusBadgeComponent],
  templateUrl: './contacts.page.html',
  styleUrl: './contacts.page.css',
})
export class ContactsPage {
  private readonly repo = inject(ContactsRepository);
  private readonly fb = inject(FormBuilder);

  readonly page = signal<PageResponse<Contact> | null>(null);
  readonly selected = signal<Contact | null>(null);
  readonly editing = signal(false);
  readonly consentContact = signal<Contact | null>(null);
  readonly deactivateContact = signal<Contact | null>(null);
  readonly message = signal('');
  readonly error = signal(false);
  readonly requestId = signal<string | undefined>(undefined);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{7,14}$/)]],
    active: [true],
  });

  constructor() {
    this.load(0);
  }

  load(page: number): void {
    this.repo.list(page, 10).subscribe((response) => this.page.set(response));
  }

  newContact(): void {
    this.selected.set(null);
    this.form.reset({ name: '', phoneNumber: '', active: true });
    this.editing.set(true);
  }

  edit(contact: Contact): void {
    this.selected.set(contact);
    this.form.reset({ name: contact.name, phoneNumber: contact.phoneNumber, active: contact.active });
    this.editing.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('Corrige los campos marcados antes de guardar el contacto.');
      this.error.set(true);
      return;
    }
    const value = this.form.getRawValue();
    const request = this.selected()
      ? this.repo.update(this.selected()!.id, value)
      : this.repo.create({ name: value.name, phoneNumber: value.phoneNumber });
    request.subscribe({
      next: () => {
        this.message.set('Contacto actualizado.');
        this.error.set(false);
        this.editing.set(false);
        this.load(this.page()?.page ?? 0);
      },
      error: (err) => this.showError(err),
    });
  }

  deactivate(contact: Contact): void {
    this.deactivateContact.set(contact);
  }

  confirmDeactivate(contact: Contact): void {
    this.repo.deactivate(contact.id).subscribe({
      next: () => {
        this.deactivateContact.set(null);
        this.load(this.page()?.page ?? 0);
      },
      error: (err) => this.showError(err),
    });
  }

  openConsent(contact: Contact): void {
    this.consentContact.set(contact);
  }

  saveConsent(contact: Contact, status: string): void {
    this.repo.updateConsent(contact.id, status as ConsentStatus).subscribe({
      next: () => {
        this.message.set('Consentimiento actualizado.');
        this.error.set(false);
        this.consentContact.set(null);
        this.load(this.page()?.page ?? 0);
      },
      error: (err) => this.showError(err),
    });
  }

  showError(err: unknown): void {
    const mapped = mapApiError(err);
    this.message.set(mapped.message);
    this.requestId.set(mapped.requestId);
    this.error.set(true);
  }

  mask = maskPhone;
  formatDateTime = formatOffsetDateTime;
}
