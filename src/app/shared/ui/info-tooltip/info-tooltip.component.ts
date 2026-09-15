import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, computed, inject, input, signal } from '@angular/core';
import { LucideCircleHelp } from '@lucide/angular';

let nextTooltipId = 0;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideCircleHelp, NgStyle],
  selector: 'app-info-tooltip',
  templateUrl: './info-tooltip.component.html',
  styleUrl: './info-tooltip.component.css',
})
export class InfoTooltipComponent {
  @ViewChild('trigger', { read: ElementRef }) private readonly trigger?: ElementRef<HTMLButtonElement>;

  private readonly host = inject(ElementRef<HTMLElement>);
  readonly text = input.required<string>();
  readonly label = input('Ver información');
  readonly id = `info-tooltip-${nextTooltipId++}`;
  readonly ariaLabel = computed(() => `${this.label()}: ${this.text()}`);
  readonly open = signal(false);
  readonly bubbleStyle = signal<Record<string, string>>({});

  show(): void {
    this.open.set(true);
    queueMicrotask(() => this.updatePosition());
  }

  hide(): void {
    this.open.set(false);
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  updatePosition(): void {
    if (!this.open()) {
      return;
    }

    const button = this.trigger?.nativeElement ?? this.host.nativeElement.querySelector('button');
    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    const left = Math.min(Math.max(rect.left + rect.width / 2, 12 + width / 2), window.innerWidth - 12 - width / 2);
    const showBelow = rect.top < 72;
    const top = showBelow ? rect.bottom + 10 : rect.top - 10;

    this.bubbleStyle.set({
      left: `${left}px`,
      maxWidth: `${width}px`,
      top: `${top}px`,
      transform: showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
    });
  }
}
