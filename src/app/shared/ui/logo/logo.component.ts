import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideCalendarDays, LucideHeartPulse } from '@lucide/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideCalendarDays, LucideHeartPulse],
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.css',
})
export class LogoComponent {}
