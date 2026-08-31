import { HttpErrorResponse } from '@angular/common/http';
import { ApiProblem, UiError } from './api-problem';

const fallback = 'No pudimos completar la operación.';

export function mapApiError(error: unknown): UiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { message: fallback };
  }

  const problem = normalizeProblem(error.error);
  const requestId = problem.requestId ?? error.headers.get('X-Request-ID') ?? undefined;
  const message = mapProblemMessage(error.status, problem);
  return { message, requestId };
}

function normalizeProblem(value: unknown): ApiProblem {
  return value && typeof value === 'object' ? (value as ApiProblem) : {};
}

function mapProblemMessage(status: number, problem: ApiProblem): string {
  if (problem.code === 'MFA_SETUP_REQUIRED') {
    return 'Vincula Google Authenticator antes de continuar.';
  }

  if (problem.code === 'MFA_REQUIRED') {
    return 'Verifica el segundo factor antes de continuar.';
  }

  if (problem.code === 'MFA_INVALID_CODE') {
    return 'Credenciales o código incorrecto. Intenta con un código vigente.';
  }

  if (problem.code === 'MFA_SETUP_EXPIRED') {
    return 'La vinculación MFA venció. Reinicia el proceso.';
  }

  if (problem.code === 'MFA_RATE_LIMITED') {
    return 'Demasiados intentos. Espera antes de volver a probar.';
  }

  if (problem.code === 'MFA_UNAVAILABLE') {
    return 'MFA no está disponible por configuración del servidor.';
  }

  if (problem.code === 'IMPORT_FILE_CHANGED') {
    return 'El archivo cambió después de la vista previa. Vuelve a analizarlo.';
  }

  if (problem.code === 'IMPORT_SCOPE_CHANGED') {
    return 'El ámbito seleccionado cambió después de la vista previa. Vuelve a analizar el archivo.';
  }

  if (status === 409 && problem.code?.includes('LAST_ADMIN')) {
    return 'No se puede desactivar ni quitar permisos al último administrador activo.';
  }

  if (status === 409 && problem.code?.includes('EMAIL')) {
    return 'Ya existe una cuenta con ese correo electrónico.';
  }

  if (status === 409) {
    return 'Ya existe un registro incompatible con esta operación.';
  }

  if (status === 403) {
    return 'No tienes permisos para acceder a esta sección.';
  }

  if (status === 401) {
    return 'Tu sesión expiró o ya no es válida.';
  }

  if (status >= 500) {
    return 'El servicio no está disponible temporalmente. Intenta nuevamente.';
  }

  return fallback;
}
