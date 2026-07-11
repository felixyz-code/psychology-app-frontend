import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CaseFileWorkspaceResponse } from '../models/case-file.models';
import { CaseFilesService } from './case-files.service';

describe('CaseFilesService', () => {
  let service: CaseFilesService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CaseFilesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('gets the aggregated workspace using the case-file workspace endpoint', () => {
    let result: CaseFileWorkspaceResponse | undefined;

    service.getWorkspace('case-file-1').subscribe((workspace) => (result = workspace));

    const request = httpTesting.expectOne('/api/case-files/case-file-1/workspace');
    expect(request.request.method).toBe('GET');
    request.flush(createWorkspace());

    expect(result).toEqual(createWorkspace());
  });

  it('gets the patient case file used by the no-case-file fallback', () => {
    service.getCaseFileByPatientId('patient-1').subscribe();

    const request = httpTesting.expectOne('/api/case-files/patient/patient-1');
    expect(request.request.method).toBe('GET');
    request.flush(createWorkspace().caseFile);
  });

  it('propagates workspace HTTP errors without transforming them', () => {
    let receivedError: unknown;

    service.getWorkspace('case-file-1').subscribe({
      error: (error) => (receivedError = error),
    });

    httpTesting.expectOne('/api/case-files/case-file-1/workspace').flush('Unavailable', {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(receivedError).toMatchObject({ status: 500, statusText: 'Internal Server Error' });
  });
});

function createWorkspace(): CaseFileWorkspaceResponse {
  return {
    caseFile: {
      id: 'case-file-1',
      patientId: 'patient-1',
      diagnosis: 'Ansiedad',
      treatmentPlan: 'Psicoterapia semanal',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-02T10:00:00.000Z',
    },
    patient: {
      id: 'patient-1',
      psychologistId: 'psychologist-1',
      firstName: 'Ana',
      lastName: 'Lopez',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
    },
    summary: {
      appointmentsCount: 0,
      sessionNotesCount: 0,
      documentsCount: 0,
      lastActivityAt: null,
      nextAppointmentAt: null,
      lastAppointmentAt: null,
    },
    appointments: [],
    sessionNotes: [],
    documents: [],
    timeline: [],
  };
}
