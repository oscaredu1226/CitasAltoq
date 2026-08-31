import { validationMessage } from './validation-message';

describe('validationMessage', () => {
  it('maps common form validation errors to user-facing messages', () => {
    expect(validationMessage({ required: true })).toBe('Este campo es obligatorio.');
    expect(validationMessage({ email: true })).toBe('Ingresa un correo electrónico válido.');
    expect(validationMessage({ passwordMismatch: true })).toBe('Las contraseñas no coinciden.');
  });

  it('includes length limits when available', () => {
    expect(validationMessage({ minlength: { requiredLength: 8 } })).toContain('8');
    expect(validationMessage({ maxlength: { requiredLength: 120 } })).toContain('120');
  });
});
