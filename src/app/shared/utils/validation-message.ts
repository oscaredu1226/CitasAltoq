import { ValidationErrors } from '@angular/forms';

export function validationMessage(errors: ValidationErrors | null | undefined): string {
  if (!errors) {
    return '';
  }

  if (errors['required']) {
    return 'Este campo es obligatorio.';
  }

  if (errors['email']) {
    return 'Ingresa un correo electrónico válido.';
  }

  if (errors['minlength']) {
    return `Debe tener al menos ${errors['minlength'].requiredLength} caracteres.`;
  }

  if (errors['maxlength']) {
    return `No debe superar ${errors['maxlength'].requiredLength} caracteres.`;
  }

  if (errors['pattern']) {
    return 'El formato ingresado no es válido.';
  }

  if (errors['passwordMismatch']) {
    return 'Las contraseñas no coinciden.';
  }

  return 'Revisa este campo antes de continuar.';
}
