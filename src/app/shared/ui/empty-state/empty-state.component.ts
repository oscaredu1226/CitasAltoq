import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideSearchX } from '@lucide/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideSearchX],
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly text = input('Ajusta los filtros para intentar nuevamente.');
}
