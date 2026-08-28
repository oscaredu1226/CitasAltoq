import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { statusView } from '../../utils/status-mappers';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css',
})
export class StatusBadgeComponent {
  readonly kind = input('generic');
  readonly value = input<string | boolean | null | undefined>(null);
  readonly view = computed(() => statusView(this.kind(), this.value()));
  readonly toneClass = computed(() => `badge--${this.view().tone}`);
}
