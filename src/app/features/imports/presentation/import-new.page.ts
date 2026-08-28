import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap, takeWhile, timer } from 'rxjs';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isAdmin, primaryScope } from '../../../core/auth/auth.models';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { AlertComponent, PageTitleComponent, StatCardComponent } from '../../../shared/ui/ui.components';
import { ImportPreview, ImportScope, ImportsRepository } from '../infrastructure/imports.repository';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, PageTitleComponent, ReactiveFormsModule, RouterLink, StatCardComponent],
  templateUrl: './import-new.page.html',
  styleUrl: './import-new.page.css',
})
export class ImportNewPage {
  private readonly repo = inject(ImportsRepository);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly file = signal<File | null>(null);
  readonly preview = signal<ImportPreview | null>(null);
  readonly analyzing = signal(false);
  readonly confirmOpen = signal(false);
  readonly acceptedBatchId = signal('');
  readonly message = signal('');
  readonly error = signal(false);
  readonly requestId = signal<string | undefined>(undefined);
  readonly admin = signal(isAdmin(this.auth.session.user()));
  readonly scopeForm = this.fb.nonNullable.group({ red: [''], microred: [''], establishment: [''] });

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !file.name.toLocaleLowerCase().endsWith('.xlsx')) {
      this.message.set('Selecciona un archivo XLSX válido.');
      this.error.set(true);
      return;
    }
    this.file.set(file);
    this.preview.set(null);
  }

  analyze(): void {
    const file = this.file();
    if (!file) {
      return;
    }

    this.analyzing.set(true);
    this.error.set(false);
    this.repo.preview(file, this.scope()).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.message.set('Vista previa completada.');
      },
      error: (err) => {
        const mapped = mapApiError(err);
        this.message.set(mapped.message);
        this.requestId.set(mapped.requestId);
        this.error.set(true);
        this.analyzing.set(false);
      },
      complete: () => this.analyzing.set(false),
    });
  }

  apply(): void {
    const file = this.file();
    const preview = this.preview();
    if (!file || !preview) {
      return;
    }

    this.confirmOpen.set(false);
    this.repo.apply(file, preview).pipe(
      switchMap((accepted) => {
        this.acceptedBatchId.set(accepted.batchId);
        this.message.set('Importación aceptada. Procesando...');
        return timer(0, 2000).pipe(
          switchMap(() => this.repo.get(accepted.batchId)),
          takeWhile((batch) => !['COMPLETED', 'FAILED'].includes(batch.status), true),
        );
      }),
    ).subscribe({
      next: (batch) => {
        if (['COMPLETED', 'FAILED'].includes(batch.status)) {
          void this.router.navigate(['/importaciones', batch.id]);
        }
      },
      error: (err) => {
        const mapped = mapApiError(err);
        this.message.set(mapped.message);
        this.requestId.set(mapped.requestId);
        this.error.set(true);
      },
    });
  }

  private scope(): ImportScope {
    if (this.admin()) {
      const value = this.scopeForm.getRawValue();
      return {
        red: value.red || null,
        microred: value.microred || null,
        establishment: value.establishment || null,
      };
    }

    const scope = primaryScope(this.auth.session.user());
    return {
      red: scope?.red ?? null,
      microred: scope?.microred ?? null,
      establishment: scope?.establishment ?? null,
    };
  }
}
