import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './forbidden.page.html',
  styleUrl: './forbidden.page.css',
})
export class ForbiddenPage {}
