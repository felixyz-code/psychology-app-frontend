import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, finalize, Subscription } from 'rxjs';

import {
  filterBusinessHourSlots,
  localDateTimeValueToIso,
  toDateTimeLocalValue,
} from '../utils/appointment-datetime';
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
export class RescheduleAppointmentDialogComponent implements OnInit, OnDestroy {
  private readonly data = inject<RescheduleAppointmentDialogData>(MAT_DIALOG_DATA);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<RescheduleAppointmentDialogComponent, boolean>);

  readonly appointment = this.data.appointment;
  readonly patientName = this.data.patientName || 'Paciente';
  readonly isSubmitting = signal(false);
  readonly isLoadingSlots = signal(false);
  readonly hasConflict = signal(false);
  readonly conflictWarning = signal('');
  readonly errorMessage = signal('');
  readonly availableSlots = signal<AvailabilitySlot[]>([]);
  readonly localTimeZone = typeof Intl !== 'undefined' && Intl.DateTimeFormat
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'
    : 'Local';

  private formSubscription?: Subscription;

  readonly rescheduleForm = this.formBuilder.nonNullable.group({
    scheduledAt: [toDateTimeLocalValue(this.appointment.scheduledAt), [Validators.required]],
    durationMinutes: [this.appointment.durationMinutes, [Validators.required, Validators.min(15)]],
    reason: ['', [Validators.required, Validators.maxLength(250)]],
  });

  ngOnInit(): void {
    this.checkAvailability();
    this.formSubscription = this.rescheduleForm.valueChanges
      .pipe(debounceTime(400))
      .subscribe(() => {
        this.checkAvailability();
      });
  }

  ngOnDestroy(): void {
    this.formSubscription?.unsubscribe();
  }

  checkAvailability(): void {
    const scheduledAtValue = this.rescheduleForm.controls.scheduledAt.value;
    if (!scheduledAtValue) {
      this.hasConflict.set(false);
      this.conflictWarning.set('');
      this.availableSlots.set([]);
      return;
    }

    const selectedDate = scheduledAtValue.split('T')[0];
    const durationMinutes = this.rescheduleForm.controls.durationMinutes.value || 60;
    const selectedIso = localDateTimeValueToIso(scheduledAtValue);
    const selectedStart = new Date(selectedIso).getTime();
    const selectedEnd = selectedStart + durationMinutes * 60_000;

    this.isLoadingSlots.set(true);
    this.errorMessage.set('');

    this.appointmentsService
      .getAvailability({
        therapistId: this.appointment.psychologistId,
        date: selectedDate,
        durationMinutes,
      })
      .pipe(finalize(() => this.isLoadingSlots.set(false)))
      .subscribe({
        next: (response) => {
          const slots = response.slots || [];
          this.availableSlots.set(filterBusinessHourSlots(slots));

          const hasOverlap = slots
            .filter((s) => !s.available)
            .some((s) => {
              const isSameAsCurrent =
                new Date(s.startTime).getTime() === new Date(this.appointment.scheduledAt).getTime();
              if (isSameAsCurrent) {
                return false;
              }
              const slotStart = new Date(s.startTime).getTime();
              const slotEnd = new Date(s.endTime).getTime();
              return selectedStart < slotEnd && selectedEnd > slotStart;
            });

          this.hasConflict.set(hasOverlap);
          this.conflictWarning.set(
            hasOverlap ? 'Existe un conflicto con otra cita o bloqueo programado para este horario.' : '',
          );
        },
        error: () => {
          this.hasConflict.set(false);
          this.conflictWarning.set('');
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
    if (this.hasConflict()) {
      this.errorMessage.set('Existe un conflicto de horario con otra cita o bloqueo.');
      return;
    }

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
