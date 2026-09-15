import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { AlertComponent, PageTitleComponent, StatCardComponent, StatusBadgeComponent } from '../../../shared/ui/ui.components';
import {
  ImportBatch,
  ImportPreview,
  ImportScopeOption,
  ImportScopeSelection,
  ImportScopesResponse,
  ImportsRepository,
} from '../infrastructure/imports.repository';

type ImportState =
  | 'preparing'
  | 'discovering'
  | 'scope-ready'
  | 'uploading'
  | 'analyzing'
  | 'preview-ready'
  | 'applying'
  | 'processing'
  | 'completed'
  | 'failed';

type ScopeMode = 'ALL' | 'ESTABLISHMENT';

interface EstablishmentScopeChoice {
  red: string;
  microred: string;
  establishment: string;
  rowCount: number;
}

const TRACKING_STORAGE_KEY = 'citas-altoq:active-import-batch';
const RUNNING_IMPORT_STATUSES = ['PENDING', 'VALIDATING', 'READY', 'PROCESSING'];

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
    StatusBadgeComponent,
  ],
  templateUrl: './import-new.page.html',
  styleUrl: './import-new.page.css',
})
export class ImportNewPage {
  private readonly repo = inject(ImportsRepository);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly file = signal<File | null>(null);
  readonly scopes = signal<ImportScopesResponse | null>(null);
  readonly scopeMode = signal<ScopeMode>('ALL');
  readonly selectedScope = signal<EstablishmentScopeChoice | null>(null);
  readonly authoritativeRoster = signal(false);
  readonly preview = signal<ImportPreview | null>(null);
  readonly batch = signal<ImportBatch | null>(null);
  readonly state = signal<ImportState>('preparing');
  readonly confirmOpen = signal(false);
  readonly acceptedBatchId = signal('');
  readonly message = signal('');
  readonly error = signal(false);
  readonly requestId = signal<string | undefined>(undefined);
  private readonly trackingStarted = signal(false);

  readonly stateText = computed(() => {
    switch (this.state()) {
      case 'discovering':
        return 'Analizando establecimientos';
      case 'scope-ready':
        return 'Alcance listo para vista previa';
      case 'uploading':
        return 'Subiendo archivo';
      case 'analyzing':
        return 'Ejecutando vista previa';
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
  readonly loadingOpen = computed(() => ['discovering', 'uploading', 'analyzing', 'applying', 'processing'].includes(this.state()));
  readonly selectedScopeText = computed(() => {
    if (this.scopeMode() === 'ALL') {
      return 'Todos los establecimientos del archivo';
    }

    const scope = this.selectedScope();
    return scope ? `${scope.establishment} · ${scope.microred} · ${scope.red}` : 'Selecciona un establecimiento específico';
  });
  readonly selectedRows = computed(() => {
    if (this.scopeMode() === 'ALL') {
      return this.scopes()?.totalDataRows ?? 0;
    }

    return this.selectedScope()?.rowCount ?? 0;
  });
  readonly progressPercent = computed(() => {
    const batch = this.batch();
    if (!batch) {
      return 0;
    }

    if (typeof batch.progressPercent === 'number') {
      return Math.min(100, Math.max(0, batch.progressPercent));
    }

    if (!batch.totalRows || !batch.processedRows) {
      return 0;
    }

    return Math.round((batch.processedRows / batch.totalRows) * 100);
  });
  readonly analyzeBlockedMessage = computed(() => {
    if (this.busy()) {
      return 'Espera a que termine la operación actual antes de continuar.';
    }

    if (!this.file()) {
      return 'Selecciona un archivo XLSX para analizar los establecimientos.';
    }

    return '';
  });
  readonly previewBlockedMessage = computed(() => {
    if (this.busy()) {
      return 'Espera a que termine la operación actual antes de continuar.';
    }

    if (!this.scopes()) {
      return 'Primero analiza los establecimientos detectados en el XLSX.';
    }

    if (this.scopeMode() === 'ESTABLISHMENT' && !this.selectedScope()) {
      return 'Selecciona el establecimiento específico que se importará.';
    }

    return '';
  });
  readonly applyBlockedMessage = computed(() => {
    if (this.canApply()) {
      return '';
    }

    if (this.busy()) {
      return 'Espera a que el servidor termine la operación actual.';
    }

    if (!this.preview()) {
      return 'Primero ejecuta la vista previa para revisar el resumen.';
    }

    return 'La importación solo puede aplicarse cuando la vista previa está lista.';
  });
  readonly loadingHint = computed(() => {
    switch (this.state()) {
      case 'discovering':
        return 'Leyendo el XLSX para encontrar redes, microredes, establecimientos y cantidad de filas.';
      case 'uploading':
        return 'Estamos enviando el XLSX al servidor. Mantén esta ventana abierta.';
      case 'analyzing':
        return 'Validando filas, encabezados e incidencias antes de mostrar el resumen.';
      case 'applying':
        return 'Confirmando el alcance seleccionado para iniciar el procesamiento.';
      case 'processing':
        return 'El servidor está aplicando cambios. El progreso se recupera desde el lote guardado.';
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

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const batchId = params.get('batchId') || this.storedBatchId();
      if (batchId && !this.trackingStarted()) {
        this.resumeBatch(batchId);
        return;
      }

      if (!batchId && !this.trackingStarted()) {
        this.recoverPendingImport();
      }
    });
  }

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.setFile(file);
  }

  dropFile(event: DragEvent): void {
    event.preventDefault();
    this.setFile(event.dataTransfer?.files?.[0] ?? null);
  }

  canDiscoverScopes(): boolean {
    return Boolean(this.file()) && !this.busy();
  }

  canPreview(): boolean {
    return Boolean(this.file() && this.scopes() && !this.previewBlockedMessage());
  }

  canApply(): boolean {
    return Boolean(this.preview()) && this.state() === 'preview-ready';
  }

  discoverScopes(): void {
    const file = this.file();
    if (!file || !this.canDiscoverScopes()) {
      this.message.set('Selecciona un archivo XLSX válido antes de analizar establecimientos.');
      this.error.set(true);
      return;
    }

    this.state.set('discovering');
    this.error.set(false);
    this.message.set('');
    this.requestId.set(undefined);
    this.repo.scopes(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (scopes) => {
        this.scopes.set(scopes);
        this.scopeMode.set('ALL');
        this.selectedScope.set(null);
        this.preview.set(null);
        this.state.set('scope-ready');
        this.message.set('Establecimientos detectados. Elige el alcance antes de ejecutar la vista previa.');
      },
      error: (err) => this.fail(err),
    });
  }

  selectAllScope(): void {
    this.scopeMode.set('ALL');
    this.selectedScope.set(null);
    this.preview.set(null);
    this.message.set('Se importará todo el archivo.');
  }

  selectEstablishmentScope(red: string, microred: string, establishment: ImportScopeOption): void {
    this.scopeMode.set('ESTABLISHMENT');
    this.selectedScope.set({ red, microred, establishment: establishment.name, rowCount: establishment.rowCount });
    this.preview.set(null);
    this.message.set('Alcance seleccionado. Ejecuta la vista previa para revisar los cambios.');
  }

  previewImport(): void {
    const file = this.file();
    if (!file || !this.canPreview()) {
      this.message.set(this.previewBlockedMessage() || 'Revisa el alcance antes de ejecutar la vista previa.');
      this.error.set(true);
      return;
    }

    this.state.set('uploading');
    this.error.set(false);
    this.message.set('');
    this.requestId.set(undefined);
    this.repo.previewEvents(file, this.scopeParams()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
        this.message.set('Vista previa completada. Revisa el resumen antes de aplicar.');
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
    this.error.set(false);
    this.message.set('');
    this.repo.apply(file, preview, this.scopeParams(), this.authoritativeRoster()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (accepted) => {
        this.acceptedBatchId.set(accepted.batchId);
        this.message.set('Importación aceptada. Recuperando progreso desde el servidor...');
        this.trackBatch(accepted.batchId, true);
      },
      error: (err) => this.fail(err),
    });
  }

  number(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE').format(value ?? 0);
  }

  batchProcessedText(batch: ImportBatch): string {
    return `${this.number(batch.processedRows ?? 0)} de ${this.number(batch.totalRows)} filas`;
  }

  issueMessage(issue: { code: string; message: string }): string {
    if (issue.code === 'MULTIPLE_GUARDIAN_PHONES_PRIMARY_SELECTED') {
      return 'Se encontraron varios teléfonos. El primer número válido será utilizado como contacto principal.';
    }

    return issue.message;
  }

  private setFile(file: File | null): void {
    if (file && !file.name.toLocaleLowerCase().endsWith('.xlsx')) {
      this.message.set('Selecciona un archivo XLSX válido.');
      this.error.set(true);
      this.state.set('failed');
      this.file.set(null);
      this.clearImportState();
      return;
    }

    this.file.set(file);
    this.clearImportState();
    this.error.set(false);
    this.message.set('');
    this.requestId.set(undefined);
    this.state.set('preparing');
    this.clearStoredBatchId();
    void this.router.navigate([], { queryParams: { batchId: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private clearImportState(): void {
    this.scopes.set(null);
    this.scopeMode.set('ALL');
    this.selectedScope.set(null);
    this.authoritativeRoster.set(false);
    this.preview.set(null);
    this.batch.set(null);
    this.acceptedBatchId.set('');
    this.confirmOpen.set(false);
  }

  private scopeParams(): ImportScopeSelection {
    if (this.scopeMode() === 'ALL') {
      return {};
    }

    const scope = this.selectedScope();
    return scope
      ? { red: scope.red, microred: scope.microred, establishment: scope.establishment }
      : {};
  }

  private resumeBatch(batchId: string): void {
    this.message.set('Recuperando progreso de una importación en curso...');
    this.trackBatch(batchId, false);
  }

  private recoverPendingImport(): void {
    this.repo.list(0, 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (page) => {
        const pending = page.content.find((batch) => RUNNING_IMPORT_STATUSES.includes(batch.status));
        const batchId = pending ? batchIdentifier(pending) : '';
        if (batchId) {
          this.resumeBatch(batchId);
        }
      },
      error: () => undefined,
    });
  }

  private trackBatch(batchId: string, updateUrl: boolean): void {
    this.trackingStarted.set(true);
    this.state.set('processing');
    this.storeBatchId(batchId);
    if (updateUrl) {
      void this.router.navigate([], { queryParams: { batchId }, queryParamsHandling: 'merge', replaceUrl: true });
    }

    timer(0, 2000).pipe(
      switchMap(() => this.repo.get(batchId)),
      takeWhile((batch) => !['COMPLETED', 'FAILED'].includes(batch.status), true),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (batch) => {
        this.batch.set(batch);
        if (batch.status === 'COMPLETED') {
          this.state.set('completed');
          this.clearStoredBatchId();
          void this.router.navigate(['/importaciones', batchIdentifier(batch)]);
        }

        if (batch.status === 'FAILED') {
          this.state.set('failed');
          this.clearStoredBatchId();
          this.message.set(batch.errorMessage || 'La importación no pudo completarse. Revisa las incidencias del archivo y vuelve a intentarlo.');
          this.error.set(true);
        }
      },
      error: (err) => this.fail(err),
    });
  }

  private fail(err: unknown): void {
    const mapped = mapApiError(err);
    this.message.set(mapped.message);
    this.requestId.set(mapped.requestId);
    this.error.set(true);
    this.state.set('failed');
  }

  private storedBatchId(): string {
    try {
      return localStorage.getItem(TRACKING_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  }

  private storeBatchId(batchId: string): void {
    try {
      localStorage.setItem(TRACKING_STORAGE_KEY, batchId);
    } catch {
      // URL tracking remains the primary recovery path when storage is unavailable.
    }
  }

  private clearStoredBatchId(): void {
    try {
      localStorage.removeItem(TRACKING_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }

  private busy(): boolean {
    return ['discovering', 'uploading', 'analyzing', 'applying', 'processing'].includes(this.state());
  }
}

function batchIdentifier(batch: ImportBatch): string {
  return batch.batchId || batch.id;
}
