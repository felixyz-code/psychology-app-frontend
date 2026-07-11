import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Appointment, CreateAppointmentRequest, UpdateAppointmentRequest } from '../models/appointment.models';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AppointmentsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('gets the global appointments list', () => {
    let result: Appointment[] | undefined;

    service.getAppointments().subscribe((appointments) => (result = appointments));

    const request = httpTesting.expectOne('/api/appointments');
    expect(request.request.method).toBe('GET');
    request.flush([createAppointment()]);

    expect(result).toEqual([createAppointment()]);
  });

  it('gets appointments for a patient', () => {
    service.getAppointmentsByPatientId('patient-1').subscribe();

    const request = httpTesting.expectOne('/api/appointments/patient/patient-1');
    expect(request.request.method).toBe('GET');
    request.flush([createAppointment()]);
  });

  it('gets one appointment by id', () => {
    let result: Appointment | undefined;

    service.getAppointmentById('appointment-1').subscribe((appointment) => (result = appointment));

    const request = httpTesting.expectOne('/api/appointments/appointment-1');
    expect(request.request.method).toBe('GET');
    request.flush(createAppointment());

    expect(result).toEqual(createAppointment());
  });

  it('posts the complete create payload', () => {
    const payload: CreateAppointmentRequest = {
      patientId: 'patient-1',
      psychologistId: 'psychologist-1',
      scheduledAt: '2026-07-15T16:30:00.000Z',
      durationMinutes: 60,
      status: 'SCHEDULED',
      notes: null,
    };

    service.createAppointment(payload).subscribe();

    const request = httpTesting.expectOne('/api/appointments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(createAppointment());
  });

  it('patches only the supplied update payload', () => {
    const payload: UpdateAppointmentRequest = { status: 'CANCELLED' };

    service.updateAppointment('appointment-1', payload).subscribe();

    const request = httpTesting.expectOne('/api/appointments/appointment-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush({ ...createAppointment(), ...payload });
  });

  it('deletes an appointment by id', () => {
    service.deleteAppointment('appointment-1').subscribe();

    const request = httpTesting.expectOne('/api/appointments/appointment-1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});

function createAppointment(): Appointment {
  return {
    id: 'appointment-1',
    patientId: 'patient-1',
    psychologistId: 'psychologist-1',
    scheduledAt: '2026-07-15T16:30:00.000Z',
    durationMinutes: 60,
    status: 'SCHEDULED',
    notes: null,
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
}
