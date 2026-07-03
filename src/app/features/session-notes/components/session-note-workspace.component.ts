import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { SessionNote } from '../models/session-note.models';

@Component({
  selector: 'app-session-note-workspace',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, SectionCardComponent],
  templateUrl: './session-note-workspace.component.html',
  styleUrl: './session-note-workspace.component.scss',
})
export class SessionNoteWorkspaceComponent {
  readonly sessionNote = input.required<SessionNote>();
  readonly showHero = input(true);
  readonly showActions = input(true);
  readonly canEdit = input(true);
  readonly canDelete = input(true);
  readonly canClose = input(true);
  readonly closeLabel = input('Cerrar');

  readonly editRequested = output<void>();
  readonly deleteRequested = output<void>();
  readonly closeRequested = output<void>();

  readonly title = computed(() => this.sessionNote().title?.trim() || 'Sesion sin titulo');

  readonly sessionSummary = computed(() => {
    const sessionDate = this.parseDate(this.sessionNote().sessionDate);
    const updatedAt = this.parseDate(this.sessionNote().updatedAt);

    return [
      {
        label: 'Fecha de sesion',
        value: this.formatDate(sessionDate),
      },
      {
        label: 'Hora registrada',
        value: this.formatTime(sessionDate),
      },
      {
        label: 'Autor responsable',
        value: 'Registrado en el sistema',
      },
      {
        label: 'Ultima actualizacion',
        value: this.formatDateTime(updatedAt),
      },
    ];
  });

  readonly recordSummary = computed(() => [
    {
      label: 'Expediente clinico',
      value: 'Asociado al expediente actual',
    },
    {
      label: 'Fecha de creacion',
      value: this.formatDateTime(this.parseDate(this.sessionNote().createdAt)),
    },
    {
      label: 'Fecha de actualizacion',
      value: this.formatDateTime(this.parseDate(this.sessionNote().updatedAt)),
    },
  ]);

  requestEdit(): void {
    this.editRequested.emit();
  }

  requestDelete(): void {
    this.deleteRequested.emit();
  }

  requestClose(): void {
    this.closeRequested.emit();
  }

  private parseDate(value: string): Date | null {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatDate(date: Date | null): string {
    if (!date) {
      return 'Pendiente';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private formatTime(date: Date | null): string {
    if (!date) {
      return 'Pendiente';
    }

    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private formatDateTime(date: Date | null): string {
    if (!date) {
      return 'Pendiente';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(date)
      .replace(',', '');
  }
}
