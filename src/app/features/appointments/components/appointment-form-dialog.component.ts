import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, finalize, Subscription } from 'rxjs';

import { AuthStore } from '../../../core/auth/auth.store';
import { OrganizationConfigurationStore } from '../../../core/organization-configuration/organization-configuration.store';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import {
  BusinessGridSlot,
  calculateSmartDefaultTime,
  filterBusinessHourSlots,
  generateBusinessHoursGrid,
  localDateTimeValueToIso,
  parseFlexibleDateTime,
  toDateTimeLocalValue,
} from '../utils/appointment-datetime';
import {
  Appointment,
  AppointmentStatus,
  AvailabilitySlot,
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
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './appointment-form-dialog.component.html',
  styleUrl: './appointment-form-dialog.component.scss',
})
export class AppointmentFormDialogComponent implements OnInit, OnDestroy {
  private readonly data = inject<AppointmentFormDialogData>(MAT_DIALOG_DATA);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly patientsService = inject(PatientsService);
  private readonly authStore = inject(AuthStore);
  private readonly organizationConfigurationStore = inject(OrganizationConfigurationStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AppointmentFormDialogComponent, boolean>);

  readonly isSaving = signal(false);
  readonly isLoadingPatients = signal(false);
  readonly isCheckingAvailability = signal(false);
  readonly hasConflict = signal(false);
  readonly conflictWarning = signal('');
  readonly availableSlots = signal<BusinessGridSlot[]>([]);
  readonly errorMessage = signal('');
  readonly mode = this.data.mode;
  readonly statuses: AppointmentStatus[] = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  readonly availablePatients = signal<Patient[]>(this.data.patients ?? []);
  readonly selectedPatient = signal<Patient | null>(null);
  readonly patientSearchTerm = signal('');
  readonly localTimeZone = typeof Intl !== 'undefined' && Intl.DateTimeFormat
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'
    : 'Local';

  readonly patientSearchControl = new FormControl<string | Patient>('');

  private valueChangeSubscription?: Subscription;
  private patientSearchSubscription?: Subscription;

  readonly filteredPatients = computed(() => {
    const term = this.patientSearchTerm().trim().toLowerCase();
    const patients = this.availablePatients();

    if (!term) {
      return patients;
    }

    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const phone = (patient.phoneNumber || '').toLowerCase();
      const email = (patient.email || '').toLowerCase();

      return fullName.includes(term) || phone.includes(term) || email.includes(term);
    });
  });

  readonly availabilityStatus = computed<'loading' | 'available' | 'conflict' | 'idle'>(() => {
    if (this.isCheckingAvailability()) {
      return 'loading';
    }
    if (this.hasConflict()) {
      return 'conflict';
    }
    if (this.appointmentForm?.controls?.scheduledAt?.value) {
      return 'available';
    }
    return 'idle';
  });

  readonly appointmentForm = this.formBuilder.nonNullable.group({
    patientId: [this.data.patientId ?? '', [Validators.required]],
    scheduledAt: [this.getInitialScheduledAtValue(), [Validators.required]],
    durationMinutes: [this.initialDurationMinutes(), [Validators.required, Validators.min(1)]],
    status: ['SCHEDULED' as AppointmentStatus, [Validators.required]],
    notes: [''],
  });

  constructor() {
    this.patientSearchSubscription = this.patientSearchControl.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        this.patientSearchTerm.set(value);
        const current = this.selectedPatient();
        if (current && this.getPatientLabel(current) !== value) {
          this.selectedPatient.set(null);
          this.appointmentForm.controls.patientId.setValue('');
        }
      } else if (!value) {
        this.patientSearchTerm.set('');
      }
    });

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
    } else {
      this.syncInitialSelectedPatient();
    }
  }

  ngOnInit(): void {
    this.checkAvailability();
    this.valueChangeSubscription = this.appointmentForm.valueChanges
      .pipe(debounceTime(400))
      .subscribe(() => {
        this.checkAvailability();
      });
  }

  ngOnDestroy(): void {
    this.valueChangeSubscription?.unsubscribe();
    this.patientSearchSubscription?.unsubscribe();
  }

  checkAvailability(): void {
    const scheduledAtValue = this.appointmentForm.controls.scheduledAt.value;
    const psychologistId = this.authStore.user()?.id;

    if (!scheduledAtValue || !psychologistId) {
      this.hasConflict.set(false);
      this.conflictWarning.set('');
      this.availableSlots.set([]);
      return;
    }

    const parsedDate = parseFlexibleDateTime(scheduledAtValue);
    if (isNaN(parsedDate.getTime())) {
      this.hasConflict.set(false);
      this.conflictWarning.set('');
      this.availableSlots.set([]);
      return;
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const selectedDate = `${year}-${month}-${day}`;

    const durationMinutes = this.appointmentForm.controls.durationMinutes.value || 60;
    const selectedStart = parsedDate.getTime();
    const selectedEnd = selectedStart + durationMinutes * 60_000;

    this.isCheckingAvailability.set(true);
    this.appointmentsService
      .getAvailability({
        therapistId: psychologistId,
        date: selectedDate,
        durationMinutes,
      })
      .pipe(finalize(() => this.isCheckingAvailability.set(false)))
      .subscribe({
        next: (response) => {
          const rawSlots = response.slots || [];
          const occupied = rawSlots
            .filter((s) => !s.available)
            .filter((s) => {
              // If in edit mode and the conflict is the current appointment, skip it
              if (this.mode === 'edit' && this.data.appointment) {
                const currentApptStart = parseFlexibleDateTime(
                  this.data.appointment.scheduledAt,
                ).getTime();
                const slotStart = parseFlexibleDateTime(s.startTime).getTime();
                if (slotStart === currentApptStart) {
                  return false;
                }
              }
              return true;
            });

          const grid = generateBusinessHoursGrid(parsedDate, occupied, 9, 19);
          this.availableSlots.set(grid);

          const hasOverlap = occupied.some((s) => {
            const slotStart = parseFlexibleDateTime(s.startTime).getTime();
            const slotEnd = parseFlexibleDateTime(s.endTime).getTime();
            return selectedStart < slotEnd && selectedEnd > slotStart;
          });

          this.hasConflict.set(hasOverlap);
          this.conflictWarning.set(
            hasOverlap
              ? 'Conflicto de horario: Ya existe una cita asignada en este rango.'
              : '',
          );
        },
        error: () => {
          this.hasConflict.set(false);
          this.conflictWarning.set('');
          this.availableSlots.set(generateBusinessHoursGrid(parsedDate, [], 9, 19));
        },
      });
  }

  selectSlot(slot: BusinessGridSlot): void {
    if (!slot.available) {
      return;
    }
    this.appointmentForm.patchValue({
      scheduledAt: toDateTimeLocalValue(slot.startTime),
    });
    this.hasConflict.set(false);
    this.conflictWarning.set('');
  }

  submit(): void {
    if (this.isSaving()) {
      return;
    }

    if (this.hasConflict()) {
      this.errorMessage.set(
        'Conflicto de horario: Ya existe una cita asignada en este rango. Selecciona otro horario.',
      );
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

  hasRequiredError(
    controlName: 'patientId' | 'scheduledAt' | 'durationMinutes' | 'status',
  ): boolean {
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

  getInitials(patient: Patient): string {
    const first = patient.firstName?.trim()?.charAt(0) || '';
    const last = patient.lastName?.trim()?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'P';
  }

  displayPatientFn = (patient: Patient | string | null): string => {
    if (!patient) {
      return '';
    }
    if (typeof patient === 'string') {
      return patient;
    }
    return this.getPatientLabel(patient);
  };

  onPatientSelected(patient: Patient): void {
    if (!patient) {
      return;
    }
    this.selectedPatient.set(patient);
    this.patientSearchControl.setValue(patient, { emitEvent: false });
    this.appointmentForm.controls.patientId.setValue(patient.id);
    this.appointmentForm.controls.patientId.markAsTouched();
    this.appointmentForm.controls.patientId.markAsDirty();
  }

  clearPatientSelection(): void {
    this.selectedPatient.set(null);
    this.patientSearchControl.setValue('');
    this.patientSearchTerm.set('');
    this.appointmentForm.controls.patientId.setValue('');
    this.appointmentForm.controls.patientId.markAsTouched();
  }

  onPatientInputBlur(): void {
    const rawSearchValue = this.patientSearchControl.value;
    if (typeof rawSearchValue === 'string') {
      const normalized = rawSearchValue.trim().toLowerCase();
      const match = this.availablePatients().find(
        (p) => this.getPatientLabel(p).toLowerCase() === normalized,
      );
      if (match) {
        this.onPatientSelected(match);
      } else if (!this.selectedPatient()) {
        this.appointmentForm.controls.patientId.setValue('');
      }
    }
    this.appointmentForm.controls.patientId.markAsTouched();
  }

  private syncInitialSelectedPatient(): void {
    const currentPatientId = this.appointmentForm.controls.patientId.value;
    if (currentPatientId) {
      const match = this.availablePatients().find((p) => p.id === currentPatientId);
      if (match) {
        this.selectedPatient.set(match);
        this.patientSearchControl.setValue(match, { emitEvent: false });
      }
    }
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
            this.getPatientLabel(first).localeCompare(this.getPatientLabel(second)),
          );

          this.availablePatients.set(sortedPatients);
          this.syncInitialSelectedPatient();
        },
        error: () => {
          this.errorMessage.set('No fue posible cargar los pacientes para la cita.');
        },
      });
  }

  private getInitialScheduledAtValue(): string {
    return toDateTimeLocalValue(calculateSmartDefaultTime(new Date(), this.data.scheduledAt));
  }

  private initialDurationMinutes(): number {
    return this.data.mode === 'edit'
      ? (this.data.appointment?.durationMinutes ?? 60)
      : (this.organizationConfigurationStore.effectiveAppointmentDuration?.() || 60);
  }
}
