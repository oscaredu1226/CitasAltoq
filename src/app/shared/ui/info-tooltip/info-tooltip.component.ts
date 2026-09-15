import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideCircleHelp } from '@lucide/angular';

let nextTooltipId = 0;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideCircleHelp],
  selector: 'app-info-tooltip',
  templateUrl: './info-tooltip.component.html',
  styleUrl: './info-tooltip.component.css',
})
export class InfoTooltipComponent {
  readonly text = input.required<string>();
  readonly label = input('Ver información');
  readonly id = `info-tooltip-${nextTooltipId++}`;
  readonly ariaLabel = computed(() => `${this.label()}: ${this.text()}`);
}
