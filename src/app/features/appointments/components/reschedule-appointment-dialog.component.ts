import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

import { localDateTimeValueToIso, toDateTimeLocalValue } from '../utils/appointment-datetime';
import { Appointment, AvailabilitySlot } from '../models/appointment.models';
import { AppointmentsService } from '../services/appointments.service';

export interface RescheduleAppointmentDialogData {
  appointment: Appointment;
  patientName?: string;
}

@Component({
  selector: 'app-reschedule-appointment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reschedule-appointment-dialog.component.html',
  styleUrl: './reschedule-appointment-dialog.component.scss',
})
export class RescheduleAppointmentDialogComponent {
  private readonly data = inject<RescheduleAppointmentDialogData>(MAT_DIALOG_DATA);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<RescheduleAppointmentDialogComponent, boolean>);

  readonly appointment = this.data.appointment;
  readonly patientName = this.data.patientName || 'Paciente';
  readonly isSubmitting = signal(false);
  readonly isLoadingSlots = signal(false);
  readonly errorMessage = signal('');
  readonly availableSlots = signal<AvailabilitySlot[]>([]);

  readonly rescheduleForm = this.formBuilder.nonNullable.group({
    scheduledAt: [toDateTimeLocalValue(this.appointment.scheduledAt), [Validators.required]],
    durationMinutes: [this.appointment.durationMinutes, [Validators.required, Validators.min(15)]],
    reason: ['', [Validators.required, Validators.maxLength(250)]],
  });

  checkAvailability(): void {
    const scheduledAtValue = this.rescheduleForm.controls.scheduledAt.value;
    if (!scheduledAtValue) {
      return;
    }

    const selectedDate = scheduledAtValue.split('T')[0];
    this.isLoadingSlots.set(true);
    this.errorMessage.set('');

    this.appointmentsService
      .getAvailability({
        therapistId: this.appointment.psychologistId,
        date: selectedDate,
        durationMinutes: this.rescheduleForm.controls.durationMinutes.value,
      })
      .pipe(finalize(() => this.isLoadingSlots.set(false)))
      .subscribe({
        next: (response) => {
          this.availableSlots.set(response.slots);
        },
        error: () => {
          this.errorMessage.set('No fue posible consultar la disponibilidad.');
        },
      });
  }

  selectSlot(slot: AvailabilitySlot): void {
    if (!slot.available) {
      return;
    }
    const localString = toDateTimeLocalValue(slot.startTime);
    this.rescheduleForm.patchValue({ scheduledAt: localString });
  }

  submit(): void {
    if (this.rescheduleForm.invalid || this.isSubmitting()) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }

    const { scheduledAt, durationMinutes, reason } = this.rescheduleForm.getRawValue();
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.appointmentsService
      .rescheduleAppointment(this.appointment.id, {
        scheduledAt: localDateTimeValueToIso(scheduledAt),
        durationMinutes,
        reason: reason.trim(),
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error: HttpErrorResponse) => {
          if (error.error?.message) {
            this.errorMessage.set(error.error.message);
          } else if (error.status === 400) {
            this.errorMessage.set('Existe un conflicto de horario con otra cita o bloqueo.');
          } else {
            this.errorMessage.set('Ocurrió un error al reprogramar la cita.');
          }
        },
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
