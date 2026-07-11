import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Patient, UpdatePatientRequest } from '../models/patient.models';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  let service: PatientsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PatientsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('gets the patient list from the patients endpoint', () => {
    let result: Patient[] | undefined;

    service.getPatients().subscribe((patients) => (result = patients));

    const request = httpTesting.expectOne('/api/patients');
    expect(request.request.method).toBe('GET');
    request.flush([createPatient()]);

    expect(result).toEqual([createPatient()]);
  });

  it('gets a patient detail from the patient endpoint', () => {
    let result: Patient | undefined;

    service.getPatientById('patient-1').subscribe((patient) => (result = patient));

    const request = httpTesting.expectOne('/api/patients/patient-1');
    expect(request.request.method).toBe('GET');
    request.flush(createPatient());

    expect(result).toEqual(createPatient());
  });

  it('patches a patient with the supplied payload', () => {
    const payload: UpdatePatientRequest = {
      firstName: 'Ana Maria',
      email: 'ana.maria@example.com',
    };

    service.updatePatient('patient-1', payload).subscribe();

    const request = httpTesting.expectOne('/api/patients/patient-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush({ ...createPatient(), ...payload });
  });

  it('propagates HTTP errors without transforming them', () => {
    let receivedError: unknown;

    service.getPatientById('patient-1').subscribe({
      error: (error) => (receivedError = error),
    });

    httpTesting.expectOne('/api/patients/patient-1').flush('Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });

    expect(receivedError).toMatchObject({ status: 503, statusText: 'Service Unavailable' });
  });
});

function createPatient(): Patient {
  return {
    id: 'patient-1',
    psychologistId: 'psychologist-1',
    firstName: 'Ana',
    lastName: 'Lopez',
    phoneNumber: '5551234567',
    email: 'ana@example.com',
    birthDate: '1990-04-10',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
}
