import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';

import { RescheduleAppointmentDialogComponent } from './reschedule-appointment-dialog.component';
import { AppointmentsService } from '../services/appointments.service';
import { Appointment } from '../models/appointment.models';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { OrganizationConfigurationStore } from '../../../core/organization-configuration/organization-configuration.store';

describe('RescheduleAppointmentDialogComponent', () => {
  let component: RescheduleAppointmentDialogComponent;
  let fixture: ComponentFixture<RescheduleAppointmentDialogComponent>;
  let appointmentsService: {
    rescheduleAppointment: ReturnType<typeof vi.fn>;
    getAppointments: ReturnType<typeof vi.fn>;
    getScheduleBlocks: ReturnType<typeof vi.fn>;
    getAvailability: ReturnType<typeof vi.fn>;
  };
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  const mockAppointment: Appointment = {
    id: 'appt-123',
    patientId: 'patient-456',
    psychologistId: 'therapist-789',
    scheduledAt: '2026-08-25T15:00:00.000Z',
    durationMinutes: 60,
    status: 'SCHEDULED',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
  };

  beforeEach(async () => {
    appointmentsService = {
      rescheduleAppointment: vi.fn().mockReturnValue(of(mockAppointment)),
      getAppointments: vi.fn().mockReturnValue(of([])),
      getScheduleBlocks: vi.fn().mockReturnValue(of([])),
      getAvailability: vi.fn().mockReturnValue(
        of({
          therapistId: 'therapist-789',
          date: '2026-08-25',
          slotDurationMinutes: 60,
          slots: [
            { startTime: '2026-08-25T10:00:00.000', endTime: '2026-08-25T11:00:00.000', available: true },
            { startTime: '2026-08-25T11:00:00.000', endTime: '2026-08-25T12:00:00.000', available: false },
          ],
        }),
      ),
    };
    dialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RescheduleAppointmentDialogComponent],
      providers: [
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: BranchContextService,
          useValue: { currentBranch: () => null, effectiveBusinessHours: () => ({ startHour: 9, endHour: 18 }) },
        },
        {
          provide: OrganizationConfigurationStore,
          useValue: { settings: () => null },
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { appointment: mockAppointment, patientName: 'Juan Perez' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RescheduleAppointmentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes form with appointment data', () => {
    expect(component.appointment.id).toBe('appt-123');
    expect(component.patientName).toBe('Juan Perez');
    expect(component.rescheduleForm.controls.durationMinutes.value).toBe(60);
  });

  it('checks availability slots and sets state with full 09:00 to 18:00 grid', () => {
    component.checkAvailability();
    expect(appointmentsService.getAvailability).toHaveBeenCalledWith({
      therapistId: 'therapist-789',
      date: expect.any(String),
      durationMinutes: 60,
      startHour: 9,
      endHour: 18,
    });
    expect(component.availableSlots().length).toBe(10);
    expect(component.localTimeZone).toBeTruthy();
  });

  it('selects available slot and updates scheduledAt control', () => {
    const slot = component.availableSlots().find((s) => s.available)!;
    component.selectSlot(slot);
    expect(component.rescheduleForm.controls.scheduledAt.value).toBeDefined();
  });

  it('submits valid reschedule form and closes dialog with true', () => {
    component.rescheduleForm.patchValue({
      scheduledAt: '2026-08-26T16:00',
      durationMinutes: 60,
      reason: 'Paciente solicitó cambio',
    });

    component.submit();
    expect(appointmentsService.rescheduleAppointment).toHaveBeenCalledWith(
      'appt-123',
      expect.objectContaining({
        durationMinutes: 60,
        reason: 'Paciente solicitó cambio',
      }),
    );
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('handles conflict errors on submit and sets errorMessage', () => {
    const errorResponse = new HttpErrorResponse({
      error: { message: 'Conflict with existing schedule block' },
      status: 400,
    });
    appointmentsService.rescheduleAppointment.mockReturnValue(throwError(() => errorResponse));

    component.rescheduleForm.patchValue({
      scheduledAt: '2026-08-26T16:00',
      durationMinutes: 60,
      reason: 'Conflicto',
    });

    component.submit();
    expect(component.errorMessage()).toBe('Conflict with existing schedule block');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('marks slots occupied when another appointment exists for the same therapist while strictly ignoring current appointment', () => {
    const otherAppt: Appointment = {
      id: 'other-appt-999',
      patientId: 'patient-other',
      psychologistId: 'therapist-789',
      scheduledAt: new Date(2026, 7, 25, 13, 0, 0).toISOString(),
      durationMinutes: 60,
      status: 'SCHEDULED',
      createdAt: '',
      updatedAt: '',
    };

    appointmentsService.getAppointments.mockReturnValue(of([mockAppointment, otherAppt]));

    component.rescheduleForm.patchValue({
      scheduledAt: '2026-08-25T13:00',
      durationMinutes: 60,
    });

    component.checkAvailability();

    expect(component.hasConflict()).toBe(true);
    expect(component.conflictWarning()).toContain('Conflicto de horario');

    const slot13 = component.availableSlots().find((s) => s.timeLabel === '13:00');
    expect(slot13?.available).toBe(false);
    expect(slot13?.conflictType).toBe('APPOINTMENT');

    // Slot 15:00 (the appointment being rescheduled) must be available and not self-conflicted
    const slot15 = component.availableSlots().find((s) => s.timeLabel === '15:00');
    expect(slot15?.available).toBe(true);

    // Prevent submission on conflict
    component.submit();
    expect(appointmentsService.rescheduleAppointment).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Conflicto de horario');
  });
});
