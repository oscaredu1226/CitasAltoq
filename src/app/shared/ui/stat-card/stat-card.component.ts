import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BadgeTone } from '../../utils/status-mappers';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.css',
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input('•');
  readonly tone = input<BadgeTone>('blue');
  readonly hint = input('');
  readonly toneClass = computed(() => `tone-${this.tone()}`);
}
