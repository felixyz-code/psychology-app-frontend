import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';

import { AuthStore } from '../../../core/auth/auth.store';
import {
  localDateTimeValueToIso,
  toDateTimeLocalValue,
} from '../utils/appointment-datetime';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from '../models/appointment.models';
import { AppointmentsService } from '../services/appointments.service';

interface AppointmentFormDialogData {
  mode: 'create' | 'edit';
  patientId: string;
  appointment?: Appointment;
}

@Component({
  selector: 'app-appointment-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './appointment-form-dialog.component.html',
  styleUrl: './appointment-form-dialog.component.scss',
})
export class AppointmentFormDialogComponent {
  private readonly data = inject<AppointmentFormDialogData>(MAT_DIALOG_DATA);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly authStore = inject(AuthStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AppointmentFormDialogComponent, boolean>);

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly mode = this.data.mode;
  readonly statuses: AppointmentStatus[] = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

  readonly appointmentForm = this.formBuilder.nonNullable.group({
    scheduledAt: [this.getCurrentDateTimeLocal(), [Validators.required]],
    durationMinutes: [50, [Validators.required, Validators.min(1)]],
    status: ['SCHEDULED' as AppointmentStatus, [Validators.required]],
    notes: [''],
  });

  constructor() {
    if (this.mode === 'edit' && this.data.appointment) {
      this.appointmentForm.patchValue({
        scheduledAt: toDateTimeLocalValue(this.data.appointment.scheduledAt),
        durationMinutes: this.data.appointment.durationMinutes,
        status: this.data.appointment.status,
        notes: this.data.appointment.notes ?? '',
      });
    }
  }

  submit(): void {
    if (this.isSaving()) {
      return;
    }

    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    const psychologistId = this.authStore.user()?.id;

    if (!psychologistId) {
      this.errorMessage.set('No fue posible identificar al usuario autenticado.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const rawValue = this.appointmentForm.getRawValue();
    const basePayload: UpdateAppointmentRequest = {
      patientId: this.data.patientId,
      psychologistId,
      scheduledAt: localDateTimeValueToIso(rawValue.scheduledAt),
      durationMinutes: rawValue.durationMinutes,
      status: rawValue.status,
      notes: this.normalizeOptional(rawValue.notes),
    };

    if (this.mode === 'edit' && this.data.appointment) {
      this.appointmentsService
        .updateAppointment(this.data.appointment.id, basePayload)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('PATCH /appointments/:id failed', {
              status: error?.status,
              body: error?.error,
              appointmentId: this.data.appointment?.id,
              payload: basePayload,
            });
            this.errorMessage.set('No fue posible guardar los cambios.');
          },
        });

      return;
    }

    const payload: CreateAppointmentRequest = {
      patientId: this.data.patientId,
      psychologistId,
      scheduledAt: basePayload.scheduledAt ?? '',
      durationMinutes: basePayload.durationMinutes ?? 50,
      status: basePayload.status,
      notes: basePayload.notes,
    };

    this.appointmentsService
      .createAppointment(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('POST /appointments failed', {
            status: error?.status,
            body: error?.error,
            payload,
          });
          this.errorMessage.set('No fue posible crear la cita.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  hasRequiredError(controlName: 'scheduledAt' | 'durationMinutes' | 'status'): boolean {
    const control = this.appointmentForm.controls[controlName];
    return control.touched && control.hasError('required');
  }

  hasMinError(): boolean {
    const control = this.appointmentForm.controls.durationMinutes;
    return control.touched && control.hasError('min');
  }

  getTitle(): string {
    return this.mode === 'edit' ? 'Editar cita' : 'Nueva cita';
  }

  getSubmitLabel(): string {
    return this.mode === 'edit' ? 'Guardar cambios' : 'Guardar cita';
  }

  getStatusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      SCHEDULED: 'Programada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistió',
    };

    return labels[status];
  }

  private normalizeOptional(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private getCurrentDateTimeLocal(): string {
    return toDateTimeLocalValue(new Date());
  }
}
