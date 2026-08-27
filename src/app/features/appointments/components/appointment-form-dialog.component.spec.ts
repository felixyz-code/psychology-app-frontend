import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';

import { AuthStore } from '../../../core/auth/auth.store';
import { OrganizationConfigurationStore } from '../../../core/organization-configuration/organization-configuration.store';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { Appointment } from '../models/appointment.models';
import { AppointmentsService } from '../services/appointments.service';
import { AppointmentFormDialogComponent } from './appointment-form-dialog.component';

describe('AppointmentFormDialogComponent', () => {
  let appointmentsService: {
    createAppointment: ReturnType<typeof vi.fn>;
    updateAppointment: ReturnType<typeof vi.fn>;
    getAvailability: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    appointmentsService = {
      createAppointment: vi.fn(),
      updateAppointment: vi.fn(),
      getAvailability: vi.fn(() =>
        of({ therapistId: 'psychologist-1', date: '2026-07-15', slotDurationMinutes: 60, slots: [] }),
      ),
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates an appointment with a local ISO date and null notes', () => {
    appointmentsService.createAppointment.mockReturnValue(of(createAppointment()));
    const { component, dialogRef } = createComponent({
      mode: 'create',
      patients: [createPatient()],
    });
    component.appointmentForm.setValue({
      patientId: 'patient-1',
      scheduledAt: '2026-07-15T09:30',
      durationMinutes: 60,
      status: 'SCHEDULED',
      notes: '   ',
    });

    component.submit();

    expect(appointmentsService.createAppointment).toHaveBeenCalledWith({
      patientId: 'patient-1',
      psychologistId: 'psychologist-1',
      scheduledAt: new Date('2026-07-15T09:30').toISOString(),
      durationMinutes: 60,
      status: 'SCHEDULED',
      notes: null,
    });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('uses PATCH for edit while preserving the normalized payload contract', () => {
    appointmentsService.updateAppointment.mockReturnValue(of(createAppointment()));
    const appointment = createAppointment();
    const { component, dialogRef } = createComponent({
      mode: 'edit',
      appointment,
      patientId: appointment.patientId,
    });
    component.appointmentForm.controls.notes.setValue('Seguimiento actualizado');

    component.submit();

    expect(appointmentsService.updateAppointment).toHaveBeenCalledWith(
      'appointment-1',
      expect.objectContaining({ notes: 'Seguimiento actualizado' }),
    );
    expect(appointmentsService.createAppointment).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('prevents a second create while the first request is pending', () => {
    const pendingRequest = new Subject<Appointment>();
    appointmentsService.createAppointment.mockReturnValue(pendingRequest);
    const { component, dialogRef } = createComponent({
      mode: 'create',
      patients: [createPatient()],
    });
    component.appointmentForm.controls.patientId.setValue('patient-1');

    component.submit();
    component.submit();

    expect(appointmentsService.createAppointment).toHaveBeenCalledTimes(1);
    expect(component.isSaving()).toBe(true);

    pendingRequest.next(createAppointment());
    pendingRequest.complete();

    expect(component.isSaving()).toBe(false);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('unlocks the form and keeps the dialog open after a save error', () => {
    appointmentsService.createAppointment.mockReturnValue(
      throwError(() => new Error('Unavailable')),
    );
    const { component, dialogRef } = createComponent({
      mode: 'create',
      patients: [createPatient()],
    });
    component.appointmentForm.controls.patientId.setValue('patient-1');

    component.submit();

    expect(component.isSaving()).toBe(false);
    expect(component.errorMessage()).toBe('No fue posible crear la cita.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('initializes CREATE duration from the effective organization default', () => {
    const { component } = createComponent(
      { mode: 'create', patients: [createPatient()] },
      () => 45,
    );

    expect(component.appointmentForm.controls.durationMinutes.value).toBe(45);
  });

  it('initializes CREATE duration with the effective platform fallback', () => {
    const { component } = createComponent(
      { mode: 'create', patients: [createPatient()] },
      () => 60,
    );

    expect(component.appointmentForm.controls.durationMinutes.value).toBe(60);
  });

  it('keeps the existing EDIT duration instead of the organization default', () => {
    const appointment = createAppointment({ durationMinutes: 75 });
    const { component } = createComponent(
      { mode: 'edit', appointment, patientId: appointment.patientId },
      () => 45,
    );

    expect(component.appointmentForm.controls.durationMinutes.value).toBe(75);
  });

  it('does not clobber an open CREATE draft when configuration loads later', () => {
    let effectiveDuration = 60;
    const { component } = createComponent(
      { mode: 'create', patients: [createPatient()] },
      () => effectiveDuration,
    );
    component.appointmentForm.controls.durationMinutes.setValue(75);

    effectiveDuration = 45;

    expect(component.appointmentForm.controls.durationMinutes.value).toBe(75);
  });

  it('submits the actual CREATE form duration rather than a later organization default', () => {
    let effectiveDuration = 45;
    appointmentsService.createAppointment.mockReturnValue(of(createAppointment()));
    const { component } = createComponent(
      { mode: 'create', patients: [createPatient()] },
      () => effectiveDuration,
    );
    component.appointmentForm.patchValue({ patientId: 'patient-1', durationMinutes: 75 });
    effectiveDuration = 30;

    component.submit();

    expect(appointmentsService.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 75 }),
    );
  });

  it('exposes local timezone and detects schedule conflicts in real time', () => {
    appointmentsService.getAvailability.mockReturnValue(
      of({
        therapistId: 'psychologist-1',
        date: '2026-07-15',
        slotDurationMinutes: 60,
        slots: [
          {
            startTime: new Date(2026, 6, 15, 9, 0, 0).toISOString(),
            endTime: new Date(2026, 6, 15, 10, 0, 0).toISOString(),
            available: false,
            conflictType: 'APPOINTMENT',
          },
          {
            startTime: new Date(2026, 6, 15, 11, 0, 0).toISOString(),
            endTime: new Date(2026, 6, 15, 12, 0, 0).toISOString(),
            available: true,
          },
        ],
      }),
    );

    const { component } = createComponent({
      mode: 'create',
      patients: [createPatient()],
    });

    expect(component.localTimeZone).toBeTruthy();

    component.appointmentForm.patchValue({
      scheduledAt: '2026-07-15T09:30',
      durationMinutes: 60,
    });
    component.checkAvailability();

    expect(component.hasConflict()).toBe(true);
    expect(component.conflictWarning()).toContain('Conflicto');
    expect(component.availableSlots().length).toBe(11);

    const freeSlot = component.availableSlots().find((s) => s.available)!;
    component.selectSlot(freeSlot);
    expect(component.hasConflict()).toBe(false);
  });

  it('detects collision with afternoon appointment at 13:00 and Latin 12h formatting', () => {
    appointmentsService.getAvailability.mockReturnValue(
      of({
        therapistId: 'psychologist-1',
        date: '2026-08-27',
        slotDurationMinutes: 60,
        slots: [
          {
            startTime: new Date(2026, 7, 27, 13, 0, 0).toISOString(),
            endTime: new Date(2026, 7, 27, 14, 0, 0).toISOString(),
            available: false,
            conflictType: 'APPOINTMENT',
          },
        ],
      }),
    );

    const { component } = createComponent({
      mode: 'create',
      patients: [createPatient()],
    });

    component.appointmentForm.patchValue({
      scheduledAt: '27/08/2026 01:00 p. m.',
      durationMinutes: 60,
    });
    component.checkAvailability();

    expect(component.hasConflict()).toBe(true);
    expect(component.conflictWarning()).toContain('Conflicto de horario');

    const slot13 = component.availableSlots().find((s) => s.timeLabel === '13:00');
    expect(slot13?.available).toBe(false);

    const slot14 = component.availableSlots().find((s) => s.timeLabel === '14:00');
    expect(slot14?.available).toBe(true);
  });

  it('filters patients reactively by name, phone or email and handles selection/clearing', () => {
    const p1: Patient = {
      id: 'patient-1',
      psychologistId: 'psychologist-1',
      firstName: 'Carlos',
      lastName: 'Santana',
      phoneNumber: '555-1234',
      email: 'carlos@test.com',
      createdAt: '',
      updatedAt: '',
    };
    const p2: Patient = {
      id: 'patient-2',
      psychologistId: 'psychologist-1',
      firstName: 'Beatriz',
      lastName: 'Mendez',
      phoneNumber: '555-9876',
      email: 'beatriz@test.com',
      createdAt: '',
      updatedAt: '',
    };

    const { component } = createComponent({
      mode: 'create',
      patients: [p1, p2],
    });

    expect(component.filteredPatients().length).toBe(2);

    // Filter by name
    component.patientSearchControl.setValue('Beatriz');
    expect(component.filteredPatients().length).toBe(1);
    expect(component.filteredPatients()[0].id).toBe('patient-2');

    // Filter by phone
    component.patientSearchControl.setValue('1234');
    expect(component.filteredPatients().length).toBe(1);
    expect(component.filteredPatients()[0].id).toBe('patient-1');

    // Select patient
    component.onPatientSelected(p2);
    expect(component.selectedPatient()?.id).toBe('patient-2');
    expect(component.appointmentForm.controls.patientId.value).toBe('patient-2');
    expect(component.getInitials(p2)).toBe('BM');
    expect(component.displayPatientFn(p2)).toBe('Beatriz Mendez');

    // Clear patient
    component.clearPatientSelection();
    expect(component.selectedPatient()).toBeNull();
    expect(component.appointmentForm.controls.patientId.value).toBe('');
    expect(component.patientSearchControl.value).toBe('');
  });

  it('updates live availability status dynamically based on conflict state', () => {
    const { component } = createComponent({
      mode: 'create',
      patients: [createPatient()],
    });

    component.appointmentForm.patchValue({
      scheduledAt: '2026-07-15T10:00',
    });

    expect(component.availabilityStatus()).toBe('available');

    component.hasConflict.set(true);
    expect(component.availabilityStatus()).toBe('conflict');

    component.isCheckingAvailability.set(true);
    expect(component.availabilityStatus()).toBe('loading');
  });

  it('prevents submission when a schedule conflict is detected', () => {
    const { component, dialogRef } = createComponent({
      mode: 'create',
      patients: [createPatient()],
    });

    component.appointmentForm.patchValue({
      patientId: 'patient-1',
      scheduledAt: '2026-07-15T10:00',
      durationMinutes: 60,
    });

    component.hasConflict.set(true);
    component.submit();

    expect(appointmentsService.createAppointment).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Conflicto');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  function createComponent(
    data: {
      mode: 'create' | 'edit';
      patients?: Patient[];
      patientId?: string;
      appointment?: Appointment;
    },
    getEffectiveDuration: () => number = () => 60,
  ): {
    component: AppointmentFormDialogComponent;
    dialogRef: { close: ReturnType<typeof vi.fn> };
  } {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [AppointmentFormDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: PatientsService, useValue: { getPatients: vi.fn(() => of([])) } },
        { provide: AuthStore, useValue: { user: () => ({ id: 'psychologist-1' }) } },
        {
          provide: OrganizationConfigurationStore,
          useValue: { effectiveAppointmentDuration: getEffectiveDuration },
        },
      ],
    });
    const fixture = TestBed.createComponent(AppointmentFormDialogComponent);
    return { component: fixture.componentInstance, dialogRef };
  }
});

function createPatient(): Patient {
  return {
    id: 'patient-1',
    psychologistId: 'psychologist-1',
    firstName: 'Ana',
    lastName: 'Lopez',
    createdAt: '',
    updatedAt: '',
  };
}

function createAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appointment-1',
    patientId: 'patient-1',
    psychologistId: 'psychologist-1',
    scheduledAt: '2026-07-15T16:30:00.000Z',
    durationMinutes: 60,
    status: 'SCHEDULED',
    notes: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}
