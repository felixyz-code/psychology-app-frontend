import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DataTableEmptyStateComponent } from '../data-table-empty-state/data-table-empty-state.component';

export interface ClinicalTimelineItem {
  id: string;
  icon: string;
  title: string;
  timestamp: string;
  description?: string | null;
  sourceType?: 'CASE_FILE' | 'APPOINTMENT' | 'SESSION_NOTE' | 'DOCUMENT';
  sourceId?: string;
}

interface ClinicalTimelineGroup {
  label: string;
  items: Array<ClinicalTimelineItem & { timeLabel: string | null }>;
}

@Component({
  selector: 'app-clinical-timeline',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule, DataTableEmptyStateComponent],
  templateUrl: './clinical-timeline.component.html',
  styleUrl: './clinical-timeline.component.scss',
})
export class ClinicalTimelineComponent {
  readonly events = input<ClinicalTimelineItem[]>([]);
  readonly loading = input(false);
  readonly errorMessage = input('');
  readonly emptyTitle = input('Sin actividad clínica');
  readonly emptyMessage = input('No existe actividad clínica registrada para este expediente.');
  readonly eventSelected = output<ClinicalTimelineItem>();

  readonly groupedEvents = computed<ClinicalTimelineGroup[]>(() => {
    const sortedEvents = [...this.events()]
      .filter((event) => this.parseDate(event.timestamp) !== null)
      .sort((left, right) => {
        return this.parseDate(right.timestamp)!.getTime() - this.parseDate(left.timestamp)!.getTime();
      });

    const groups = new Map<string, ClinicalTimelineGroup>();

    for (const event of sortedEvents) {
      const date = this.parseDate(event.timestamp);

      if (!date) {
        continue;
      }

      const key = this.getDayKey(date);
      const existingGroup = groups.get(key);
      const timelineEvent = {
        ...event,
        timeLabel: this.formatTime(date),
      };

      if (existingGroup) {
        existingGroup.items.push(timelineEvent);
        continue;
      }

      groups.set(key, {
        label: this.getDayLabel(date),
        items: [timelineEvent],
      });
    }

    return Array.from(groups.values());
  });

  isInteractive(event: ClinicalTimelineItem): boolean {
    return Boolean(event.sourceType && event.sourceId);
  }

  selectEvent(event: ClinicalTimelineItem): void {
    if (!this.isInteractive(event)) {
      return;
    }

    this.eventSelected.emit(event);
  }

  private getDayKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private getDayLabel(date: Date): string {
    const today = new Date();
    const dayDifference = this.getDayDifference(date, today);

    if (dayDifference === 0) {
      return 'Hoy';
    }

    if (dayDifference === 1) {
      return 'Ayer';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long',
    }).format(date);
  }

  private formatTime(date: Date): string | null {
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private getDayDifference(date: Date, reference: Date): number {
    const currentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const referenceDay = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()).getTime();
    const dayInMilliseconds = 24 * 60 * 60 * 1000;

    return Math.round((referenceDay - currentDay) / dayInMilliseconds);
  }

  private parseDate(value: string): Date | null {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }
}
