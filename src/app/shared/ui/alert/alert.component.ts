import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BadgeTone } from '../../utils/status-mappers';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.css',
})
export class AlertComponent {
  readonly title = input('Aviso');
  readonly message = input('');
  readonly requestId = input<string | undefined>(undefined);
  readonly tone = input<BadgeTone>('blue');
  readonly toneClass = computed(() => `alert--${this.tone()}`);
}
