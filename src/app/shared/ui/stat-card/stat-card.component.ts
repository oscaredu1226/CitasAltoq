import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { LucideIcon } from '@lucide/angular';
import { BadgeTone } from '../../utils/status-mappers';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.css',
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input('');
  readonly iconComponent = input<LucideIcon | null>(null);
  readonly tone = input<BadgeTone>('blue');
  readonly hint = input('');
  readonly toneClass = computed(() => `tone-${this.tone()}`);
}
