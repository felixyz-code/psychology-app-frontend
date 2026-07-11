import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { Appointment } from '../../appointments/models/appointment.models';
import { AppointmentsService } from '../../appointments/services/appointments.service';
import { CaseFile, CaseFileWorkspaceResponse } from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { Document } from '../../documents/models/document.models';
import { FinancialTransactionResponse, FinancialTransactionSummaryDto } from '../../financial-transactions/models/financial-transaction.models';
import { FinancialTransactionsService } from '../../financial-transactions/services/financial-transactions.service';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { SessionNote } from '../../session-notes/models/session-note.models';
import { ReportsCatalogService } from './reports-catalog.service';
import { ReportsRunnerService } from './reports-runner.service';

describe('ReportsRunnerService', () => {
  let appointmentsService: { getAppointments: ReturnType<typeof vi.fn> };
  let caseFilesService: { getCaseFileByPatientId: ReturnType<typeof vi.fn>; getWorkspace: ReturnType<typeof vi.fn> };
  let financialTransactionsService: { findAll: ReturnType<typeof vi.fn>; findSummary: ReturnType<typeof vi.fn> };
  let patientsService: { getPatientById: ReturnType<typeof vi.fn>; getPatients: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    appointmentsService = { getAppointments: vi.fn(() => of([])) };
    caseFilesService = { getCaseFileByPatientId: vi.fn(() => of(createCaseFile())), getWorkspace: vi.fn(() => of(createWorkspace())) };
    financialTransactionsService = { findAll: vi.fn(() => of([])), findSummary: vi.fn(() => of(createSummary())) };
    patientsService = { getPatientById: vi.fn(() => of(createPatient())), getPatients: vi.fn(() => of([createPatient()])) };
    TestBed.configureTestingModule({
      providers: [
        ReportsCatalogService,
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: CaseFilesService, useValue: caseFilesService },
        { provide: FinancialTransactionsService, useValue: financialTransactionsService },
        { provide: PatientsService, useValue: patientsService },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('uses one inclusive query for financial summary and rows', async () => {
    financialTransactionsService.findAll.mockReturnValue(of([createTransaction()]));
    const service = createService();

    const result = await firstValueFrom(
      service.runFinancialReport({ from: '2026-01-31', to: '2026-02-01', type: 'INCOME' })
    );

    const expectedQuery = {
      from: new Date(2026, 0, 31).toISOString(),
      to: new Date(2026, 1, 2).toISOString(),
      type: 'INCOME' as const,
    };
    expect(financialTransactionsService.findSummary).toHaveBeenCalledWith(expectedQuery);
    expect(financialTransactionsService.findAll).toHaveBeenCalledWith(expectedQuery);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].values['concept']).toBe('Sesión clínica');
  });

  it('returns a valid empty financial report and propagates source errors', async () => {
    const service = createService();
    const emptyResult = await firstValueFrom(service.runFinancialReport({}));
    expect(emptyResult.rows).toEqual([]);
    expect(emptyResult.emptyTitle).not.toBe('');

    financialTransactionsService.findSummary.mockReturnValue(throwError(() => new Error('Unavailable')));
    await expect(firstValueFrom(service.runFinancialReport({}))).rejects.toThrow('Unavailable');
  });

  it('filters agenda inclusively by patient and status, then orders it chronologically', async () => {
    appointmentsService.getAppointments.mockReturnValue(
      of([
        createAppointment('outside', '2026-07-04T00:00:00.000Z', 'SCHEDULED'),
        createAppointment('late', '2026-07-02T16:00:00.000Z', 'SCHEDULED'),
        createAppointment('early', '2026-07-01T08:00:00.000Z', 'SCHEDULED'),
        createAppointment('other-patient', '2026-07-01T10:00:00.000Z', 'SCHEDULED', 'patient-2'),
        createAppointment('cancelled', '2026-07-01T11:00:00.000Z', 'CANCELLED'),
      ])
    );
    const service = createService();

    const result = await firstValueFrom(
      service.runAgendaReport({ from: '2026-07-01', to: '2026-07-02', patientId: 'patient-1', status: 'SCHEDULED' })
    );

    expect(result.rows.map((row) => row.id)).toEqual(['early', 'late']);
    expect(result.groups).toHaveLength(2);
  });

  it('returns an empty agenda report when no appointment matches the filters', async () => {
    appointmentsService.getAppointments.mockReturnValue(of([createAppointment('cancelled', '2026-07-01T11:00:00.000Z', 'CANCELLED')]));
    const result = await firstValueFrom(createService().runAgendaReport({ status: 'SCHEDULED' }));

    expect(result.rows).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it('builds a clinical summary from completed appointments and sorted clinical activity', async () => {
    const workspace = createWorkspace();
    workspace.appointments = [
      createAppointment('completed', '2026-07-02T10:00:00.000Z', 'COMPLETED'),
      createAppointment('scheduled', '2026-07-02T11:00:00.000Z', 'SCHEDULED'),
    ];
    workspace.sessionNotes = [createNote('older', '2026-07-01T10:00:00.000Z'), createNote('newer', '2026-07-02T10:00:00.000Z')];
    caseFilesService.getWorkspace.mockReturnValue(of(workspace));

    const result = await firstValueFrom(
      createService().runClinicalSummaryReport({ patientId: 'patient-1', from: '2026-07-01', to: '2026-07-02' })
    );
    const content = result.clinicalContent;

    expect(content?.kind).toBe('summary');
    if (content?.kind === 'summary') {
      expect(content.kpis.find((metric) => metric.label === 'Sesiones completadas')?.value).toBe('1 cita');
      expect(content.notes.map((note) => note.id)).toEqual(['newer', 'older']);
    }
  });

  it('treats a missing case file as a valid empty clinical summary', async () => {
    caseFilesService.getCaseFileByPatientId.mockReturnValue(throwError(() => ({ status: 404 })));

    const result = await firstValueFrom(createService().runClinicalSummaryReport({ patientId: 'patient-1' }));

    expect(caseFilesService.getWorkspace).not.toHaveBeenCalled();
    expect(result.clinicalContent?.kind).toBe('summary');
    expect(result.rows).toEqual([]);
  });

  it('propagates an unexpected case-file error', async () => {
    caseFilesService.getCaseFileByPatientId.mockReturnValue(throwError(() => ({ status: 500, message: 'Unavailable' })));

    await expect(firstValueFrom(createService().runClinicalSummaryReport({ patientId: 'patient-1' }))).rejects.toMatchObject({ status: 500 });
  });

  it('builds the clinical record with documents, references, full appointments, and timeline', async () => {
    const workspace = createWorkspace();
    workspace.appointments = [createAppointment('scheduled', '2026-07-02T10:00:00.000Z', 'SCHEDULED')];
    workspace.documents = [createDocument()];
    caseFilesService.getWorkspace.mockReturnValue(of(workspace));

    const result = await firstValueFrom(createService().runClinicalRecordReport({ patientId: 'patient-1' }));
    const content = result.clinicalContent;

    expect(content?.kind).toBe('record');
    if (content?.kind === 'record') {
      expect(content.appointments).toHaveLength(1);
      expect(content.documents).toHaveLength(1);
      expect(content.references).toHaveLength(1);
      expect(content.timelineItems).toHaveLength(1);
    }
  });

  it('treats a missing case file as a valid empty clinical record', async () => {
    caseFilesService.getCaseFileByPatientId.mockReturnValue(throwError(() => ({ status: 404 })));

    const result = await firstValueFrom(createService().runClinicalRecordReport({ patientId: 'patient-1' }));

    expect(caseFilesService.getWorkspace).not.toHaveBeenCalled();
    expect(result.clinicalContent?.kind).toBe('record');
    expect(result.rows).toEqual([]);
  });

  it('propagates an unexpected case-file error for the clinical record', async () => {
    caseFilesService.getCaseFileByPatientId.mockReturnValue(throwError(() => ({ status: 500, message: 'Unavailable' })));

    await expect(firstValueFrom(createService().runClinicalRecordReport({ patientId: 'patient-1' }))).rejects.toMatchObject({ status: 500 });
  });

  function createService(): ReportsRunnerService {
    return TestBed.runInInjectionContext(() => new ReportsRunnerService());
  }
});

function createPatient(): Patient {
  return { id: 'patient-1', psychologistId: 'psychologist-1', firstName: 'Ana', lastName: 'Lopez', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' };
}

function createCaseFile(): CaseFile {
  return { id: 'case-file-1', patientId: 'patient-1', diagnosis: 'Ansiedad', treatmentPlan: 'Seguimiento semanal', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' };
}

function createAppointment(id: string, scheduledAt: string, status: Appointment['status'], patientId = 'patient-1'): Appointment {
  return { id, patientId, psychologistId: 'psychologist-1', scheduledAt, durationMinutes: 60, status, notes: null, createdAt: '', updatedAt: '' };
}

function createNote(id: string, sessionDate: string): SessionNote {
  return { id, caseFileId: 'case-file-1', authorId: 'psychologist-1', title: id, content: 'Seguimiento clínico', sessionDate, createdAt: '', updatedAt: '' };
}

function createDocument(): Document {
  return { id: 'document-1', caseFileId: 'case-file-1', uploadedById: 'psychologist-1', fileName: 'informe.pdf', filePath: '/informe.pdf', mimeType: 'application/pdf', uploadedAt: '2026-07-02T10:00:00.000Z', updatedAt: '' };
}

function createWorkspace(): CaseFileWorkspaceResponse {
  return {
    caseFile: createCaseFile(),
    patient: createPatient(),
    summary: { appointmentsCount: 0, sessionNotesCount: 0, documentsCount: 0, lastActivityAt: null, nextAppointmentAt: null, lastAppointmentAt: null },
    appointments: [],
    sessionNotes: [],
    documents: [],
    timeline: [{ id: 'timeline-1', type: 'CASE_FILE_CREATED', sourceType: 'CASE_FILE', occurredAt: '2026-07-01T10:00:00.000Z', title: 'Expediente creado' }],
  };
}

function createTransaction(): FinancialTransactionResponse {
  return { id: 'transaction-1', type: 'INCOME', status: 'COMPLETED', category: 'SESSION', amount: '650.50', currency: 'MXN', concept: 'Sesión clínica', description: null, occurredAt: '2026-02-01T10:00:00.000Z', dueDate: null, paymentMethod: 'TRANSFER', notes: null, patientId: null, appointmentId: null, createdById: 'psychologist-1', createdAt: '', updatedAt: '' };
}

function createSummary(): FinancialTransactionSummaryDto {
  return { incomeTotal: 650.5, expenseTotal: 0, adjustmentTotal: 0, refundTotal: 0, netTotal: 650.5, transactionCount: 1 };
}
