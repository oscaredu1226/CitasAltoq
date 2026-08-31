import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { validationMessage } from '../../utils/validation-message';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-field-error',
  templateUrl: './field-error.component.html',
  styleUrl: './field-error.component.css',
})
export class FieldErrorComponent {
  readonly control = input<AbstractControl | null>(null);
  readonly message = input('');

  readonly visible = computed(() => {
    const control = this.control();
    return Boolean(this.message() || (control?.invalid && (control.touched || control.dirty)));
  });

  readonly text = computed(() => this.message() || validationMessage(this.control()?.errors));
}
