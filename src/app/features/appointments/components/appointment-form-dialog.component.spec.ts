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
  };

  beforeEach(() => {
    appointmentsService = { createAppointment: vi.fn(), updateAppointment: vi.fn() };
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
