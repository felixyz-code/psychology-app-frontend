import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { Appointment } from '../../appointments/models/appointment.models';
import { AppointmentsService } from '../../appointments/services/appointments.service';
import { CaseFile } from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { Document as ClinicalDocument } from '../../documents/models/document.models';
import { DocumentsService } from '../../documents/services/documents.service';
import { FinancialTransactionSummaryDto } from '../../financial-transactions/models/financial-transaction.models';
import { FinancialTransactionsService } from '../../financial-transactions/services/financial-transactions.service';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { SessionNote } from '../../session-notes/models/session-note.models';
import { SessionNotesService } from '../../session-notes/services/session-notes.service';
import { DashboardSnapshot } from '../models/dashboard-analytics.models';
import { DashboardAnalyticsService } from './dashboard-analytics.service';

describe('DashboardAnalyticsService', () => {
  let appointmentsService: { getAppointments: ReturnType<typeof vi.fn> };
  let caseFilesService: { getCaseFiles: ReturnType<typeof vi.fn> };
  let documentsService: { getAll: ReturnType<typeof vi.fn> };
  let financialTransactionsService: { findSummary: ReturnType<typeof vi.fn> };
  let patientsService: { getPatients: ReturnType<typeof vi.fn> };
  let sessionNotesService: { getSessionNotes: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T18:00:00.000Z'));

    appointmentsService = { getAppointments: vi.fn(() => of([appointment('today', '2026-07-02T16:00:00.000Z')])) };
    caseFilesService = { getCaseFiles: vi.fn(() => of([caseFile()])) };
    documentsService = { getAll: vi.fn(() => of([document()])) };
    financialTransactionsService = { findSummary: vi.fn(() => of(financialSummary())) };
    patientsService = { getPatients: vi.fn(() => of([patient()])) };
    sessionNotesService = { getSessionNotes: vi.fn(() => of([sessionNote()])) };

    TestBed.configureTestingModule({
      providers: [
        DashboardAnalyticsService,
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: CaseFilesService, useValue: caseFilesService },
        { provide: DocumentsService, useValue: documentsService },
        { provide: FinancialTransactionsService, useValue: financialTransactionsService },
        { provide: PatientsService, useValue: patientsService },
        { provide: SessionNotesService, useValue: sessionNotesService },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('composes the dashboard view model from every required source', async () => {
    const result = await firstValueFrom(TestBed.inject(DashboardAnalyticsService).loadDashboardData());

    expect(patientsService.getPatients).toHaveBeenCalledOnce();
    expect(appointmentsService.getAppointments).toHaveBeenCalledOnce();
    expect(caseFilesService.getCaseFiles).toHaveBeenCalledOnce();
    expect(sessionNotesService.getSessionNotes).toHaveBeenCalledOnce();
    expect(documentsService.getAll).toHaveBeenCalledOnce();
    expect(financialTransactionsService.findSummary).toHaveBeenCalledOnce();
    expect(result.snapshot.generatedAt).toBe('2026-07-02T18:00:00.000Z');
    expect(result.viewModel.kpiStrip.map((metric) => metric.id)).toEqual([
      'patients-total',
      'appointments-today',
      'upcoming-appointments',
      'monthly-balance',
    ]);
    expect(result.viewModel.agendaToday.items.map((item) => item.id)).toEqual(['today']);
    expect(result.viewModel.financeSummary.metrics.find((metric) => metric.id === 'movements')?.value).toBe('3 transacciones');
    expect(result.viewModel.clinicalActivity.items.map((item) => item.id)).toEqual([
      'document-document-1',
      'note-note-1',
      'case-file-case-file-1',
    ]);
    expect(result.viewModel.warnings).toEqual([]);
  });

  it('keeps available data and exposes a partial warning when one source fails', async () => {
    documentsService.getAll.mockReturnValue(throwError(() => new Error('Documents unavailable')));

    const result = await firstValueFrom(TestBed.inject(DashboardAnalyticsService).loadDashboardData());

    expect(result.snapshot.documents).toEqual([]);
    expect(result.snapshot.patients).toHaveLength(1);
    expect(result.snapshot.appointments).toHaveLength(1);
    expect(result.snapshot.failedSources).toEqual(['documentos']);
    expect(result.viewModel.warnings).toEqual(['Algunos bloques se cargaron con datos parciales: documentos.']);
    expect(result.viewModel.agendaToday.items[0]?.patientName).toBe('Ana Lopez');
  });

  it('falls back only the failed financial source while keeping operational widgets usable', async () => {
    financialTransactionsService.findSummary.mockReturnValue(throwError(() => new Error('Finance unavailable')));

    const viewModel = await firstValueFrom(TestBed.inject(DashboardAnalyticsService).loadDashboardViewModel());

    expect(viewModel.financeSummary.metrics.every((metric) => metric.value === '--')).toBe(true);
    expect(viewModel.agendaToday.totalCount).toBe(1);
    expect(viewModel.warnings).toEqual(['Algunos bloques se cargaron con datos parciales: resumen financiero.']);
  });

  it('classifies today and upcoming appointments from the fixed generated date in chronological order', () => {
    const service = TestBed.inject(DashboardAnalyticsService);
    const viewModel = service.buildViewModel(
      snapshot({
        appointments: [
          appointment('future-late', '2026-07-04T18:00:00.000Z'),
          appointment('today-late', '2026-07-02T22:00:00.000Z'),
          appointment('future-early', '2026-07-03T15:00:00.000Z'),
          appointment('today-early', '2026-07-02T15:00:00.000Z'),
          appointment('cancelled-future', '2026-07-03T14:00:00.000Z', 'CANCELLED'),
        ],
      })
    );

    expect(viewModel.agendaToday.items.map((item) => item.id)).toEqual(['today-early', 'today-late']);
    expect(viewModel.upcomingAppointments.items.map((item) => item.id)).toEqual([
      'today-late',
      'future-early',
      'future-late',
    ]);
  });

  it('builds operational alerts only for past scheduled appointments in recent-first order', () => {
    const service = TestBed.inject(DashboardAnalyticsService);
    const viewModel = service.buildViewModel(
      snapshot({
        appointments: [
          appointment('oldest', '2026-07-01T15:00:00.000Z'),
          appointment('completed-past', '2026-07-01T16:00:00.000Z', 'COMPLETED'),
          appointment('newest', '2026-07-02T15:00:00.000Z'),
          appointment('future', '2026-07-03T15:00:00.000Z'),
        ],
      })
    );

    expect(viewModel.operationalAlerts.items.map((item) => item.id)).toEqual(['newest', 'oldest']);
  });
});

function snapshot(overrides: Partial<DashboardSnapshot> = {}): DashboardSnapshot {
  return {
    patients: [patient()],
    appointments: [appointment('today', '2026-07-02T16:00:00.000Z')],
    caseFiles: [caseFile()],
    sessionNotes: [sessionNote()],
    documents: [document()],
    financialSummary: financialSummary(),
    failedSources: [],
    generatedAt: '2026-07-02T18:00:00.000Z',
    ...overrides,
  };
}

function patient(): Patient {
  return {
    id: 'patient-1',
    psychologistId: 'psychologist-1',
    firstName: 'Ana',
    lastName: 'Lopez',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };
}

function appointment(
  id: string,
  scheduledAt: string,
  status: Appointment['status'] = 'SCHEDULED'
): Appointment {
  return {
    id,
    patientId: 'patient-1',
    psychologistId: 'psychologist-1',
    scheduledAt,
    durationMinutes: 60,
    status,
    notes: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };
}

function caseFile(): CaseFile {
  return {
    id: 'case-file-1',
    patientId: 'patient-1',
    diagnosis: 'Ansiedad',
    treatmentPlan: 'Seguimiento semanal',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T09:00:00.000Z',
  };
}

function sessionNote(): SessionNote {
  return {
    id: 'note-1',
    caseFileId: 'case-file-1',
    authorId: 'psychologist-1',
    title: 'Seguimiento',
    content: 'Evolucion favorable',
    sessionDate: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
}

function document(): ClinicalDocument {
  return {
    id: 'document-1',
    caseFileId: 'case-file-1',
    uploadedById: 'psychologist-1',
    fileName: 'informe.pdf',
    filePath: '/informe.pdf',
    mimeType: 'application/pdf',
    uploadedAt: '2026-07-01T11:00:00.000Z',
    updatedAt: '2026-07-01T11:00:00.000Z',
  };
}

function financialSummary(): FinancialTransactionSummaryDto {
  return {
    incomeTotal: 1200,
    expenseTotal: 200,
    adjustmentTotal: 0,
    refundTotal: 0,
    netTotal: 1000,
    transactionCount: 3,
  };
}
