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
import { catchError, debounceTime, finalize, forkJoin, of, Subscription } from 'rxjs';

import { AuthStore } from '../../../core/auth/auth.store';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { OrganizationConfigurationStore } from '../../../core/organization-configuration/organization-configuration.store';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import {
  BusinessGridSlot,
  calculateSmartDefaultTime,
  checkIntervalOverlap,
  filterBusinessHourSlots,
  generateBusinessHoursGrid,
  localDateTimeValueToIso,
  OccupiedInterval,
  parseFlexibleDateTime,
  resolveBusinessHours,
  toDateTimeLocalValue,
} from '../utils/appointment-datetime';
import {
  Appointment,
  AppointmentStatus,
  AvailabilityQuery,
  AvailabilityResponse,
  AvailabilitySlot,
  CreateAppointmentRequest,
  ScheduleBlock,
  UpdateAppointmentRequest,
} from '../models/appointment.models';
import { AppointmentsService } from '../services/appointments.service';

interface AppointmentFormDialogData {
  mode: 'create' | 'edit';
  patientId?: string;
  patients?: Patient[];
  appointment?: Appointment;
  scheduledAt?: Date;
  existingAppointments?: Appointment[];
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
  private readonly branchContextService = inject(BranchContextService, { optional: true });
  private readonly organizationConfigurationStore = inject(OrganizationConfigurationStore, {
    optional: true,
  });
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AppointmentFormDialogComponent, boolean>);

  readonly isSaving = signal(false);
  readonly isLoadingPatients = signal(false);
  readonly isCheckingAvailability = signal(false);
  readonly hasConflict = signal(false);
  readonly conflictWarning = signal('');
  readonly availableSlots = signal<BusinessGridSlot[]>([]);
  readonly allAppointments = signal<Appointment[]>(
    this.data.existingAppointments ?? (this.data.appointment ? [this.data.appointment] : []),
  );
  readonly scheduleBlocks = signal<ScheduleBlock[]>([]);
  readonly errorMessage = signal('');
  readonly mode = this.data.mode;
  readonly statuses: AppointmentStatus[] = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  readonly availablePatients = signal<Patient[]>(this.data.patients ?? []);
  readonly selectedPatient = signal<Patient | null>(null);
  readonly patientSearchTerm = signal('');
  readonly localTimeZone =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'
      : 'Local';

  readonly patientSearchControl = new FormControl<string | Patient>('');

  private valueChangeSubscription?: Subscription;
  private patientSearchSubscription?: Subscription;
  private availabilitySubscription?: Subscription;

  readonly businessHours = computed(() => {
    return resolveBusinessHours(
      this.branchContextService?.currentBranch(),
      this.organizationConfigurationStore?.settings?.(),
    );
  });

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
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.checkAvailability();
      });
  }

  ngOnDestroy(): void {
    this.valueChangeSubscription?.unsubscribe();
    this.patientSearchSubscription?.unsubscribe();
    this.availabilitySubscription?.unsubscribe();
  }

  formatTimeHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  checkAvailability(): void {
    const scheduledAtValue = this.appointmentForm.controls.scheduledAt.value;
    const durationMinutes = Number(this.appointmentForm.controls.durationMinutes.value) || 60;
    const psychologistId = this.authStore.user()?.id;

    if (!scheduledAtValue) {
      this.hasConflict.set(false);
      this.conflictWarning.set('');
      this.availableSlots.set([]);
      return;
    }

    const startNew = parseFlexibleDateTime(scheduledAtValue);
    if (isNaN(startNew.getTime())) {
      this.hasConflict.set(false);
      this.conflictWarning.set('');
      this.availableSlots.set([]);
      return;
    }

    const startA = startNew.getTime();
    const endA = startA + durationMinutes * 60_000;
    const { startHour, endHour } = this.businessHours();

    // 1. Immediate local collision check against all known appointments
    const knownAppts = this.allAppointments().filter((app) => {
      if (this.mode === 'edit' && this.data.appointment && app.id === this.data.appointment.id) {
        return false;
      }
      if (app.status === 'CANCELLED') {
        return false;
      }
      if (psychologistId && app.psychologistId && app.psychologistId !== psychologistId) {
        return false;
      }
      return true;
    });

    const hasImmediateApptOverlap = knownAppts.some((app) => {
      const startB = new Date(app.scheduledAt).getTime();
      const endB = startB + (app.durationMinutes || 60) * 60_000;
      return startA < endB && endA > startB;
    });

    const hasImmediateBlockOverlap = this.scheduleBlocks().some((block) => {
      const startB = new Date(block.startTime).getTime();
      const endB = new Date(block.endTime).getTime();
      return startA < endB && endA > startB;
    });

    if (hasImmediateApptOverlap || hasImmediateBlockOverlap) {
      this.hasConflict.set(true);
      this.conflictWarning.set('Conflicto de horario: Ya existe una cita asignada en este rango.');
    }

    const initialOccupied: OccupiedInterval[] = [
      ...knownAppts.map((app) => ({
        startTime: new Date(app.scheduledAt).getTime(),
        durationMinutes: app.durationMinutes || 60,
        type: 'APPOINTMENT' as const,
      })),
      ...this.scheduleBlocks().map((block) => ({
        startTime: new Date(block.startTime).getTime(),
        endTime: new Date(block.endTime).getTime(),
        type: 'SCHEDULE_BLOCK' as const,
        title: block.title,
      })),
    ];
    this.availableSlots.set(
      generateBusinessHoursGrid(startNew, initialOccupied, startHour, endHour),
    );

    // 2. Fetch full remote appointments, blocks, and availability from server
    this.isCheckingAvailability.set(true);
    this.availabilitySubscription?.unsubscribe();

    const year = startNew.getFullYear();
    const month = String(startNew.getMonth() + 1).padStart(2, '0');
    const day = String(startNew.getDate()).padStart(2, '0');
    const selectedDate = `${year}-${month}-${day}`;

    const availabilityQuery: AvailabilityQuery = {
      therapistId: psychologistId || '',
      date: selectedDate,
      durationMinutes,
      startHour,
      endHour,
    };

    this.availabilitySubscription = forkJoin({
      appointments: this.appointmentsService
        .getAppointments()
        .pipe(catchError(() => of(this.allAppointments()))),
      scheduleBlocks: psychologistId
        ? this.appointmentsService
            .getScheduleBlocks({ therapistId: psychologistId })
            .pipe(catchError(() => of([] as ScheduleBlock[])))
        : of([] as ScheduleBlock[]),
      availability: psychologistId
        ? this.appointmentsService
            .getAvailability(availabilityQuery)
            .pipe(catchError(() => of(null as AvailabilityResponse | null)))
        : of(null as AvailabilityResponse | null),
    })
      .pipe(finalize(() => this.isCheckingAvailability.set(false)))
      .subscribe({
        next: ({ appointments, scheduleBlocks, availability }) => {
          this.allAppointments.set(appointments);
          this.scheduleBlocks.set(scheduleBlocks);

          const activeAppts = appointments.filter((app) => {
            if (
              this.mode === 'edit' &&
              this.data.appointment &&
              app.id === this.data.appointment.id
            ) {
              return false;
            }
            if (app.status === 'CANCELLED') {
              return false;
            }
            if (psychologistId && app.psychologistId && app.psychologistId !== psychologistId) {
              return false;
            }
            return true;
          });

          const activeBlocks = scheduleBlocks.filter(
            (b) => !psychologistId || !b.therapistId || b.therapistId === psychologistId,
          );

          const apptOverlap = activeAppts.some((app) => {
            const startB = new Date(app.scheduledAt).getTime();
            const endB = startB + (app.durationMinutes || 60) * 60_000;
            return startA < endB && endA > startB;
          });

          const blockOverlap = activeBlocks.some((block) => {
            const startB = new Date(block.startTime).getTime();
            const endB = new Date(block.endTime).getTime();
            return startA < endB && endA > startB;
          });

          // Also check server availability slots if present
          let availabilitySlotOverlap = false;
          if (availability?.slots) {
            const occupiedSlots = availability.slots
              .filter((s) => !s.available)
              .filter((s) => {
                if (this.mode === 'edit' && this.data.appointment) {
                  const currentApptStart = new Date(this.data.appointment.scheduledAt).getTime();
                  const slotStart = new Date(s.startTime).getTime();
                  if (slotStart === currentApptStart) {
                    return false;
                  }
                }
                return true;
              });

            availabilitySlotOverlap = occupiedSlots.some((s) => {
              const slotStart = new Date(s.startTime).getTime();
              const slotEnd = new Date(s.endTime).getTime();
              return startA < slotEnd && endA > slotStart;
            });
          }

          const hasConflict = apptOverlap || blockOverlap || availabilitySlotOverlap;
          this.hasConflict.set(hasConflict);
          this.conflictWarning.set(
            hasConflict
              ? 'Conflicto de horario: Ya existe una cita asignada en este rango.'
              : '',
          );

          const occupiedIntervals: OccupiedInterval[] = [
            ...activeAppts.map((app) => ({
              startTime: new Date(app.scheduledAt).getTime(),
              durationMinutes: app.durationMinutes || 60,
              type: 'APPOINTMENT' as const,
            })),
            ...activeBlocks.map((b) => ({
              startTime: new Date(b.startTime).getTime(),
              endTime: new Date(b.endTime).getTime(),
              type: 'SCHEDULE_BLOCK' as const,
              title: b.title,
            })),
          ];

          if (availability?.slots) {
            for (const slot of availability.slots) {
              if (!slot.available) {
                occupiedIntervals.push({
                  startTime: new Date(slot.startTime).getTime(),
                  endTime: new Date(slot.endTime).getTime(),
                  type: slot.conflictType || 'APPOINTMENT',
                  title: slot.title,
                });
              }
            }
          }

          const grid = generateBusinessHoursGrid(startNew, occupiedIntervals, startHour, endHour);
          this.availableSlots.set(grid);
        },
        error: () => {
          // Keep current local evaluation
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
      : (this.organizationConfigurationStore?.effectiveAppointmentDuration?.() || 60);
  }
}
