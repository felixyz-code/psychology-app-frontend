import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

export type MetricCardVariant = 'blue' | 'green' | 'amber' | 'violet';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './metric-card.component.html',
  styleUrl: './metric-card.component.scss',
})
export class MetricCardComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly value = input.required<string>();
  readonly supportingText = input('');
  readonly variant = input<MetricCardVariant>('blue');
  readonly loading = input(false);
}
