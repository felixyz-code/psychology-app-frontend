import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

import { Appointment } from '../models/appointment.models';
import { AppointmentsService } from '../services/appointments.service';

interface AppointmentDeleteDialogData {
  appointment: Appointment;
}

@Component({
  selector: 'app-appointment-delete-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './appointment-delete-dialog.component.html',
  styleUrl: './appointment-delete-dialog.component.scss',
})
export class AppointmentDeleteDialogComponent {
  private readonly data = inject<AppointmentDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly dialogRef = inject(MatDialogRef<AppointmentDeleteDialogComponent, boolean>);

  readonly appointment = this.data.appointment;
  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');

  confirmDelete(): void {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.errorMessage.set('');

    this.appointmentsService
      .deleteAppointment(this.appointment.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error) => {
          if (error?.status === 401 || error?.status === 403) {
            this.errorMessage.set('No tienes permisos para eliminar esta cita.');
            return;
          }

          if (error?.status === 404) {
            this.errorMessage.set('La cita ya no está disponible.');
            return;
          }

          this.errorMessage.set('No fue posible eliminar la cita.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
