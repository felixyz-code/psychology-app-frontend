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
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
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
  patientId?: string;
  patients?: Patient[];
  appointment?: Appointment;
  scheduledAt?: Date;
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
  private readonly patientsService = inject(PatientsService);
  private readonly authStore = inject(AuthStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AppointmentFormDialogComponent, boolean>);

  readonly isSaving = signal(false);
  readonly isLoadingPatients = signal(false);
  readonly errorMessage = signal('');
  readonly mode = this.data.mode;
  readonly statuses: AppointmentStatus[] = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  readonly availablePatients = signal<Patient[]>(this.data.patients ?? []);

  readonly appointmentForm = this.formBuilder.nonNullable.group({
    patientId: [this.data.patientId ?? '', [Validators.required]],
    scheduledAt: [this.getInitialScheduledAtValue(), [Validators.required]],
    durationMinutes: [60, [Validators.required, Validators.min(1)]],
    status: ['SCHEDULED' as AppointmentStatus, [Validators.required]],
    notes: [''],
  });

  constructor() {
    if (this.mode === 'edit' && this.data.appointment) {
      this.appointmentForm.patchValue({
        patientId: this.data.patientId ?? this.data.appointment.patientId,
        scheduledAt: toDateTimeLocalValue(this.data.appointment.scheduledAt),
        durationMinutes: this.data.appointment.durationMinutes,
        status: this.data.appointment.status,
        notes: this.data.appointment.notes ?? '',
      });
    }

    if (!this.availablePatients().length) {
      this.loadPatients();
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
    const patientId = this.appointmentForm.controls.patientId.getRawValue();

    if (!psychologistId) {
      this.errorMessage.set('No fue posible identificar al usuario autenticado.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const rawValue = this.appointmentForm.getRawValue();
    const basePayload: UpdateAppointmentRequest = {
      patientId,
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
          error: () => {
            this.errorMessage.set('No fue posible guardar los cambios.');
          },
        });

      return;
    }

    const payload: CreateAppointmentRequest = {
      patientId,
      psychologistId,
      scheduledAt: basePayload.scheduledAt ?? '',
      durationMinutes: basePayload.durationMinutes ?? 60,
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
        error: () => {
          this.errorMessage.set('No fue posible crear la cita.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  hasRequiredError(controlName: 'patientId' | 'scheduledAt' | 'durationMinutes' | 'status'): boolean {
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

  getSubtitle(): string {
    return this.mode === 'edit'
      ? 'Actualiza la programacion de la cita y conserva la informacion asociada.'
      : 'Completa los datos necesarios para registrar una nueva cita en la agenda.';
  }

  getSubmitLabel(): string {
    return this.mode === 'edit' ? 'Guardar cambios' : 'Guardar cita';
  }

  getPatientSectionMessage(): string {
    if (this.isLoadingPatients()) {
      return 'Cargando pacientes disponibles...';
    }

    if (this.availablePatients().length) {
      return 'Selecciona al paciente asociado a esta cita.';
    }

    return 'No hay pacientes disponibles para seleccionar en este momento.';
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

  getPatientLabel(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`;
  }

  private normalizeOptional(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private loadPatients(): void {
    this.isLoadingPatients.set(true);

    this.patientsService
      .getPatients()
      .pipe(finalize(() => this.isLoadingPatients.set(false)))
      .subscribe({
        next: (patients) => {
          const sortedPatients = [...patients].sort((first, second) =>
            this.getPatientLabel(first).localeCompare(this.getPatientLabel(second))
          );

          this.availablePatients.set(sortedPatients);
        },
        error: () => {
          this.errorMessage.set('No fue posible cargar los pacientes para la cita.');
        },
      });
  }

  private getCurrentDateTimeLocal(): string {
    return toDateTimeLocalValue(new Date());
  }

  private getInitialScheduledAtValue(): string {
    if (this.data.scheduledAt) {
      return toDateTimeLocalValue(this.data.scheduledAt);
    }

    return this.getCurrentDateTimeLocal();
  }
}
