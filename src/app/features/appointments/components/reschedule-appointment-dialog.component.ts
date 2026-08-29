import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, debounceTime, finalize, forkJoin, of, Subscription } from 'rxjs';

import { BranchContextService } from '../../../core/services/branch-context.service';
import { OrganizationConfigurationStore } from '../../../core/organization-configuration/organization-configuration.store';
import {
  BusinessGridSlot,
  checkIntervalOverlap,
  generateBusinessHoursGrid,
  localDateTimeValueToIso,
  OccupiedInterval,
  parseFlexibleDateTime,
  resolveBusinessHours,
  toDateTimeLocalValue,
} from '../utils/appointment-datetime';
import {
  Appointment,
  AvailabilityResponse,
  ScheduleBlock,
} from '../models/appointment.models';
import { AppointmentsService } from '../services/appointments.service';

export interface RescheduleAppointmentDialogData {
  appointment: Appointment;
  patientName?: string;
  existingAppointments?: Appointment[];
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
  private readonly branchContextService = inject(BranchContextService, { optional: true });
  private readonly organizationConfigurationStore = inject(OrganizationConfigurationStore, {
    optional: true,
  });
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<RescheduleAppointmentDialogComponent, boolean>);

  readonly appointment = this.data.appointment;
  readonly patientName = this.data.patientName || 'Paciente';
  readonly isSubmitting = signal(false);
  readonly isLoadingSlots = signal(false);
  readonly hasConflict = signal(false);
  readonly conflictWarning = signal('');
  readonly errorMessage = signal('');
  readonly availableSlots = signal<BusinessGridSlot[]>([]);
  readonly allAppointments = signal<Appointment[]>(
    this.data.existingAppointments ?? [this.data.appointment],
  );
  readonly scheduleBlocks = signal<ScheduleBlock[]>([]);
  readonly localTimeZone =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'
      : 'Local';

  private formSubscription?: Subscription;
  private availabilitySubscription?: Subscription;

  readonly businessHours = computed(() => {
    return resolveBusinessHours(
      this.branchContextService?.currentBranch(),
      this.organizationConfigurationStore?.settings?.(),
    );
  });

  readonly rescheduleForm = this.formBuilder.nonNullable.group({
    scheduledAt: [toDateTimeLocalValue(this.appointment.scheduledAt), [Validators.required]],
    durationMinutes: [this.appointment.durationMinutes, [Validators.required, Validators.min(15)]],
    reason: ['', [Validators.required, Validators.maxLength(250)]],
  });

  ngOnInit(): void {
    this.checkAvailability();
    this.formSubscription = this.rescheduleForm.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.checkAvailability();
      });
  }

  ngOnDestroy(): void {
    this.formSubscription?.unsubscribe();
    this.availabilitySubscription?.unsubscribe();
  }

  formatTimeHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  checkAvailability(): void {
    const scheduledAtValue = this.rescheduleForm.controls.scheduledAt.value;
    if (!scheduledAtValue) {
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

    const durationMinutes = Number(this.rescheduleForm.controls.durationMinutes.value) || 60;
    const selectedStart = parsedDate.getTime();
    const selectedEnd = selectedStart + durationMinutes * 60_000;
    const { startHour, endHour } = this.businessHours();
    const therapistId = this.appointment.psychologistId;
    const currentAppointmentId = this.appointment.id;

    // 1. Immediate local collision check against all known other appointments
    const knownOtherAppts = this.allAppointments().filter((app) => {
      // Exclude exclusively the appointment currently being rescheduled!
      if (app.id === currentAppointmentId) {
        return false;
      }
      if (app.status === 'CANCELLED') {
        return false;
      }
      if (therapistId && app.psychologistId && app.psychologistId !== therapistId) {
        return false;
      }
      return true;
    });

    const hasImmediateApptOverlap = knownOtherAppts.some((app) => {
      const startB = new Date(app.scheduledAt).getTime();
      const endB = startB + (app.durationMinutes || 60) * 60_000;
      return selectedStart < endB && selectedEnd > startB;
    });

    const knownBlocks = this.scheduleBlocks().filter(
      (b) => !therapistId || !b.therapistId || b.therapistId === therapistId,
    );

    const hasImmediateBlockOverlap = knownBlocks.some((block) => {
      const startB = new Date(block.startTime).getTime();
      const endB = new Date(block.endTime).getTime();
      return selectedStart < endB && selectedEnd > startB;
    });

    if (hasImmediateApptOverlap || hasImmediateBlockOverlap) {
      this.hasConflict.set(true);
      this.conflictWarning.set('Conflicto de horario: Ya existe una cita asignada en este rango.');
    }

    const initialOccupied: OccupiedInterval[] = [
      ...knownOtherAppts.map((app) => ({
        startTime: new Date(app.scheduledAt).getTime(),
        durationMinutes: app.durationMinutes || 60,
        type: 'APPOINTMENT' as const,
      })),
      ...knownBlocks.map((block) => ({
        startTime: new Date(block.startTime).getTime(),
        endTime: new Date(block.endTime).getTime(),
        type: 'SCHEDULE_BLOCK' as const,
        title: block.title,
      })),
    ];
    this.availableSlots.set(
      generateBusinessHoursGrid(parsedDate, initialOccupied, startHour, endHour),
    );

    // 2. Fetch remote data
    this.isLoadingSlots.set(true);
    this.errorMessage.set('');

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const selectedDate = `${year}-${month}-${day}`;

    this.availabilitySubscription?.unsubscribe();
    this.availabilitySubscription = forkJoin({
      appointments: this.appointmentsService
        .getAppointments()
        .pipe(catchError(() => of(this.allAppointments()))),
      scheduleBlocks: therapistId
        ? this.appointmentsService
            .getScheduleBlocks({ therapistId })
            .pipe(catchError(() => of([] as ScheduleBlock[])))
        : of([] as ScheduleBlock[]),
      availability: therapistId
        ? this.appointmentsService
            .getAvailability({
              therapistId,
              date: selectedDate,
              durationMinutes,
              startHour,
              endHour,
            })
            .pipe(catchError(() => of(null as AvailabilityResponse | null)))
        : of(null as AvailabilityResponse | null),
    })
      .pipe(finalize(() => this.isLoadingSlots.set(false)))
      .subscribe({
        next: ({ appointments, scheduleBlocks, availability }) => {
          this.allAppointments.set(appointments);
          this.scheduleBlocks.set(scheduleBlocks);

          // Strictly filter out ONLY the current appointment being rescheduled
          const activeOtherAppts = appointments.filter((app) => {
            if (app.id === currentAppointmentId) {
              return false;
            }
            if (app.status === 'CANCELLED') {
              return false;
            }
            if (therapistId && app.psychologistId && app.psychologistId !== therapistId) {
              return false;
            }
            return true;
          });

          const activeBlocks = scheduleBlocks.filter(
            (b) => !therapistId || !b.therapistId || b.therapistId === therapistId,
          );

          const apptOverlap = activeOtherAppts.some((app) => {
            const startB = new Date(app.scheduledAt).getTime();
            const endB = startB + (app.durationMinutes || 60) * 60_000;
            return selectedStart < endB && selectedEnd > startB;
          });

          const blockOverlap = activeBlocks.some((block) => {
            const startB = new Date(block.startTime).getTime();
            const endB = new Date(block.endTime).getTime();
            return selectedStart < endB && selectedEnd > startB;
          });

          let availabilitySlotOverlap = false;
          if (availability?.slots) {
            const currentApptStart = new Date(this.appointment.scheduledAt).getTime();
            const occupiedSlots = availability.slots
              .filter((s) => !s.available)
              .filter((s) => {
                const slotStart = new Date(s.startTime).getTime();
                return slotStart !== currentApptStart;
              });

            availabilitySlotOverlap = occupiedSlots.some((s) => {
              const slotStart = new Date(s.startTime).getTime();
              const slotEnd = new Date(s.endTime).getTime();
              return selectedStart < slotEnd && selectedEnd > slotStart;
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
            ...activeOtherAppts.map((app) => ({
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
            const currentApptStart = new Date(this.appointment.scheduledAt).getTime();
            for (const slot of availability.slots) {
              if (!slot.available) {
                const slotStart = new Date(slot.startTime).getTime();
                if (slotStart !== currentApptStart) {
                  occupiedIntervals.push({
                    startTime: slotStart,
                    endTime: new Date(slot.endTime).getTime(),
                    type: slot.conflictType || 'APPOINTMENT',
                    title: slot.title,
                  });
                }
              }
            }
          }

          const grid = generateBusinessHoursGrid(
            parsedDate,
            occupiedIntervals,
            startHour,
            endHour,
          );
          this.availableSlots.set(grid);
        },
        error: () => {
          // Keep local grid
        },
      });
  }

  selectSlot(slot: BusinessGridSlot): void {
    if (!slot.available) {
      return;
    }
    const localString = toDateTimeLocalValue(slot.startTime);
    this.rescheduleForm.patchValue({ scheduledAt: localString });
    this.hasConflict.set(false);
    this.conflictWarning.set('');
  }

  submit(): void {
    if (this.hasConflict()) {
      this.errorMessage.set('Conflicto de horario: Ya existe una cita asignada en este rango.');
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
