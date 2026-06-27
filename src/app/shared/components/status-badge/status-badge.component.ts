import { Component, computed, input } from '@angular/core';

export type StatusBadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly variant = input<StatusBadgeVariant>('neutral');

  readonly badgeClass = computed(() => {
    const classMap: Record<StatusBadgeVariant, string> = {
      primary: 'app-status-badge--scheduled',
      success: 'app-status-badge--completed',
      warning: 'app-status-badge--no-show',
      danger: 'app-status-badge--cancelled',
      neutral: '',
    };

    return classMap[this.variant()];
  });
}
