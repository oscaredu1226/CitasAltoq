import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCircleCheck,
  LucideCloudUpload,
  LucideFileSpreadsheet,
  LucideRefreshCw,
  LucideTriangleAlert,
} from '@lucide/angular';
import { switchMap, takeWhile, timer } from 'rxjs';
import { mapApiError } from '../../../core/http/error-message.mapper';
import { AlertComponent, PageTitleComponent, StatCardComponent } from '../../../shared/ui/ui.components';
import { ImportPreview, ImportsRepository } from '../infrastructure/imports.repository';

type ImportState =
  | 'preparing'
  | 'uploading'
  | 'uploaded'
  | 'analyzing'
  | 'preview-ready'
  | 'applying'
  | 'processing'
  | 'completed'
  | 'failed';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertComponent,
    LucideArrowLeft,
    LucideCloudUpload,
    LucideFileSpreadsheet,
    LucideTriangleAlert,
    PageTitleComponent,
    RouterLink,
    StatCardComponent,
  ],
  templateUrl: './import-new.page.html',
  styleUrl: './import-new.page.css',
})
export class ImportNewPage {
  private readonly repo = inject(ImportsRepository);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly file = signal<File | null>(null);
  readonly preview = signal<ImportPreview | null>(null);
  readonly state = signal<ImportState>('preparing');
  readonly confirmOpen = signal(false);
  readonly acceptedBatchId = signal('');
  readonly message = signal('');
  readonly error = signal(false);
  readonly requestId = signal<string | undefined>(undefined);
  readonly stateText = computed(() => {
    switch (this.state()) {
      case 'uploading':
        return 'Subiendo archivo';
      case 'uploaded':
        return 'Archivo listo para análisis';
      case 'analyzing':
        return 'Analizando archivo';
      case 'preview-ready':
        return 'Vista previa lista';
      case 'applying':
        return 'Aplicando importación';
      case 'processing':
        return 'Procesando importación en el servidor';
      case 'completed':
        return 'Importación completada';
      case 'failed':
        return 'Importación fallida';
      default:
        return 'Preparando archivo';
    }
  });
  readonly loadingOpen = computed(() => ['uploading', 'analyzing', 'applying', 'processing'].includes(this.state()));
  readonly loadingHint = computed(() => {
    switch (this.state()) {
      case 'uploading':
        return 'Estamos enviando el XLSX al servidor. Mantén esta ventana abierta.';
      case 'analyzing':
        return 'Validando filas, establecimientos y posibles incidencias antes de mostrar la vista previa.';
      case 'applying':
        return 'Confirmando los cambios seleccionados para iniciar el procesamiento.';
      case 'processing':
        return 'El servidor está aplicando los cambios y conservando el historial de citas.';
      default:
        return 'Preparando la operación.';
    }
  });
  readonly icons = {
    check: LucideCircleCheck,
    file: LucideFileSpreadsheet,
    refresh: LucideRefreshCw,
    warning: LucideTriangleAlert,
  };

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.setFile(file);
  }

  dropFile(event: DragEvent): void {
    event.preventDefault();
    this.setFile(event.dataTransfer?.files?.[0] ?? null);
  }

  canAnalyze(): boolean {
    if (!this.file() || ['uploading', 'analyzing', 'applying', 'processing'].includes(this.state())) {
      return false;
    }

    return true;
  }

  canApply(): boolean {
    return Boolean(this.preview()) && this.state() === 'preview-ready';
  }

  analyze(): void {
    const file = this.file();
    if (!file || !this.canAnalyze()) {
      this.message.set('Selecciona un archivo XLSX válido antes de analizar.');
      this.error.set(true);
      return;
    }

    this.state.set('uploading');
    this.error.set(false);
    this.repo.previewEvents(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (event) => {
        if (event.type === 'sent') {
          this.state.set('uploading');
          return;
        }

        if (event.type === 'progress') {
          if (event.progress >= 100) {
            this.state.set('analyzing');
          }
          return;
        }

        this.preview.set(event.preview);
        this.state.set('preview-ready');
        this.message.set('Vista previa completada.');
      },
      error: (err) => this.fail(err),
    });
  }

  apply(): void {
    const file = this.file();
    const preview = this.preview();
    if (!file || !preview) {
      return;
    }

    this.confirmOpen.set(false);
    this.state.set('applying');
    this.repo.apply(file, preview).pipe(
      switchMap((accepted) => {
        this.acceptedBatchId.set(accepted.batchId);
        this.message.set('Importación aceptada. Procesando...');
        this.state.set('processing');
        return timer(0, 2000).pipe(
          switchMap(() => this.repo.get(accepted.batchId)),
          takeWhile((batch) => !['COMPLETED', 'FAILED'].includes(batch.status), true),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (batch) => {
        if (batch.status === 'COMPLETED') {
          this.state.set('completed');
          void this.router.navigate(['/importaciones', batch.id]);
        }

        if (batch.status === 'FAILED') {
          this.state.set('failed');
          this.message.set(batch.errorMessage || 'La importación falló durante el procesamiento.');
          this.error.set(true);
        }
      },
      error: (err) => this.fail(err),
    });
  }

  private setFile(file: File | null): void {
    if (file && !file.name.toLocaleLowerCase().endsWith('.xlsx')) {
      this.message.set('Selecciona un archivo XLSX válido.');
      this.error.set(true);
      this.state.set('failed');
      return;
    }
    this.file.set(file);
    this.preview.set(null);
    this.error.set(false);
    this.message.set('');
    this.state.set(file ? 'uploaded' : 'preparing');
  }

  private fail(err: unknown): void {
    const mapped = mapApiError(err);
    this.message.set(mapped.message);
    this.requestId.set(mapped.requestId);
    this.error.set(true);
    this.state.set('failed');
  }
}
