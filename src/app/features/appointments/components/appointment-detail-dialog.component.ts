import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { AuthStore } from '../../../core/auth/auth.store';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { Appointment, AppointmentStatus } from '../models/appointment.models';

interface AppointmentDetailDialogData {
  appointment: Appointment;
  patientName: string;
}

@Component({
  selector: 'app-appointment-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule, StatusBadgeComponent],
  templateUrl: './appointment-detail-dialog.component.html',
  styleUrl: './appointment-detail-dialog.component.scss',
})
export class AppointmentDetailDialogComponent {
  private static readonly DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  private readonly data = inject<AppointmentDetailDialogData>(MAT_DIALOG_DATA);
  private readonly authStore = inject(AuthStore);
  private readonly dialogRef = inject(
    MatDialogRef<AppointmentDetailDialogComponent, { action: 'close' } | { action: 'edit'; appointment: Appointment }>
  );

  readonly appointment = this.data.appointment;
  readonly patientName = this.data.patientName;

  close(): void {
    this.dialogRef.close({ action: 'close' });
  }

  edit(): void {
    this.dialogRef.close({
      action: 'edit',
      appointment: this.appointment,
    });
  }

  getDisplayValue(value?: string | null): string {
    return value?.trim() || '-';
  }

  getPsychologistDisplayName(): string {
    const currentUser = this.authStore.user();

    if (currentUser && currentUser.id === this.appointment.psychologistId) {
      return currentUser.name;
    }

    return this.appointment.psychologistId ? 'Profesional asignado' : 'No disponible';
  }

  getAppointmentStatusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      SCHEDULED: 'Programada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistio',
    };

    return labels[status];
  }

  getAppointmentStatusClass(status: AppointmentStatus): StatusBadgeVariant {
    const classes: Record<AppointmentStatus, StatusBadgeVariant> = {
      SCHEDULED: 'primary',
      COMPLETED: 'success',
      CANCELLED: 'danger',
      NO_SHOW: 'warning',
    };

    return classes[status];
  }

  getAppointmentSummary(): string {
    return AppointmentDetailDialogComponent.DATE_TIME_FORMATTER.format(new Date(this.appointment.scheduledAt));
  }
}
