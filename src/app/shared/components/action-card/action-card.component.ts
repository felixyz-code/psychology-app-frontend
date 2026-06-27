import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type ActionCardVariant = 'primary' | 'secondary';

@Component({
  selector: 'app-action-card',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './action-card.component.html',
  styleUrl: './action-card.component.scss',
})
export class ActionCardComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly variant = input<ActionCardVariant>('secondary');
  readonly disabled = input(false);

  readonly triggered = output<void>();

  handleClick(): void {
    if (!this.disabled()) {
      this.triggered.emit();
    }
  }
}
