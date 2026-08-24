import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  Appointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from '../models/appointment.models';
import { TENANT_HTTP_MODE } from '../../../core/tenant-context/tenant-http-context';
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

  it('posts reschedule appointment request', () => {
    const payload = {
      scheduledAt: '2026-08-25T15:00:00.000Z',
      durationMinutes: 45,
      reason: 'Paciente solicitó cambio',
    };

    service.rescheduleAppointment('appointment-1', payload).subscribe();

    const request = httpTesting.expectOne('/api/appointments/appointment-1/reschedule');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(createAppointment());
  });

  it('gets availability with query params', () => {
    service
      .getAvailability({
        therapistId: 'therapist-1',
        date: '2026-08-25',
        durationMinutes: 60,
        startHour: 8,
        endHour: 18,
      })
      .subscribe();

    const request = httpTesting.expectOne(
      '/api/appointments/availability?therapistId=therapist-1&date=2026-08-25&durationMinutes=60&startHour=8&endHour=18',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      therapistId: 'therapist-1',
      date: '2026-08-25',
      slotDurationMinutes: 60,
      slots: [],
    });
  });

  it('gets schedule blocks with filters', () => {
    service
      .getScheduleBlocks({
        therapistId: 'therapist-1',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
      })
      .subscribe();

    const request = httpTesting.expectOne(
      '/api/schedule-blocks?therapistId=therapist-1&startDate=2026-08-01&endDate=2026-08-31',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('creates a schedule block', () => {
    const payload = {
      title: 'Capacitación',
      reason: 'Curso',
      startTime: '2026-08-25T14:00:00.000Z',
      endTime: '2026-08-25T16:00:00.000Z',
    };

    service.createScheduleBlock(payload).subscribe();

    const request = httpTesting.expectOne('/api/schedule-blocks');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ id: 'block-1', ...payload });
  });

  it('deletes a schedule block', () => {
    service.deleteScheduleBlock('block-1').subscribe();

    const request = httpTesting.expectOne('/api/schedule-blocks/block-1');
    expect(request.request.method).toBe('DELETE');
    request.flush({ id: 'block-1' });
  });

  it('gets public teleconsultation room with token and PUBLIC http mode', () => {
    service.getPublicTeleconsultationRoom('room-123', 'tok-456').subscribe();

    const request = httpTesting.expectOne((req) =>
      req.url === '/api/teleconsultation/access/room-123' &&
      req.params.get('token') === 'tok-456',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(TENANT_HTTP_MODE)).toBe('PUBLIC');
    request.flush({ id: 'room-1', roomCode: 'room-123' });
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
