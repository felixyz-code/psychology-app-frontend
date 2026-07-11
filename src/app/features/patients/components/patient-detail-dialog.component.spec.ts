import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { AppointmentsService } from '../../appointments/services/appointments.service';
import { CaseFileWorkspaceResponse } from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { SessionNoteDeleteDialogComponent } from '../../session-notes/components/session-note-delete-dialog.component';
import { SessionNoteFormDialogComponent } from '../../session-notes/components/session-note-form-dialog.component';
import { Patient } from '../models/patient.models';
import { PatientDetailDialogComponent } from './patient-detail-dialog.component';

describe('PatientDetailDialogComponent', () => {
  let caseFilesService: {
    getWorkspace: ReturnType<typeof vi.fn<(caseFileId: string) => Observable<CaseFileWorkspaceResponse>>>;
    getCaseFileByPatientId: ReturnType<typeof vi.fn<(patientId: string) => Observable<never>>>;
  };
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    caseFilesService = {
      getWorkspace: vi.fn<(caseFileId: string) => Observable<CaseFileWorkspaceResponse>>(),
      getCaseFileByPatientId: vi.fn<(patientId: string) => Observable<never>>(),
    };
    dialog = { open: vi.fn() };
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads the aggregated workspace and exposes its clinical state', () => {
    const workspace = createWorkspace();
    caseFilesService.getWorkspace.mockReturnValue(of(workspace));

    const component = createComponent({ caseFileId: workspace.caseFile.id });

    expect(caseFilesService.getWorkspace).toHaveBeenCalledWith('case-file-1');
    expect(component.caseFile()).toEqual(workspace.caseFile);
    expect(component.patient()).toMatchObject({ firstName: 'Ana', email: 'ana@example.com' });
    expect(component.workspaceSummary()).toEqual(workspace.summary);
    expect(component.appointments()).toEqual(workspace.appointments);
    expect(component.timelineItems()).toEqual([
      expect.objectContaining({ id: 'timeline-1', title: 'Nota de sesion registrada' }),
    ]);
    expect(component.isCaseFileLoading()).toBe(false);
  });

  it('keeps a missing case file as an empty state without reporting a workspace error', () => {
    caseFilesService.getCaseFileByPatientId.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
    );

    const component = createComponent();

    expect(caseFilesService.getCaseFileByPatientId).toHaveBeenCalledWith('patient-1');
    expect(caseFilesService.getWorkspace).not.toHaveBeenCalled();
    expect(component.caseFile()).toBeNull();
    expect(component.workspaceSummary()).toBeNull();
    expect(component.appointments()).toEqual([]);
    expect(component.caseFileErrorMessage()).toBe('');
    expect(component.isCaseFileLoading()).toBe(false);
  });

  it('clears obsolete workspace data and exposes the error state when refresh fails', () => {
    caseFilesService.getWorkspace
      .mockReturnValueOnce(of(createWorkspace()))
      .mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' }))
      );
    const component = createComponent({ caseFileId: 'case-file-1' });

    component.refreshWorkspaceData();

    expect(component.caseFile()).toBeNull();
    expect(component.workspaceSummary()).toBeNull();
    expect(component.appointments()).toEqual([]);
    expect(component.sessionNotes()).toEqual([]);
    expect(component.documents()).toEqual([]);
    expect(component.timelineItems()).toEqual([]);
    expect(component.caseFileErrorMessage()).toBe('No fue posible cargar el Clinical Workspace.');
    expect(component.isCaseFileLoading()).toBe(false);
    expect(component.isTimelineLoading()).toBe(false);
  });

  it('refreshes the workspace after patient and case-file edits', () => {
    const refreshedWorkspace = createWorkspace();
    refreshedWorkspace.patient = { ...refreshedWorkspace.patient, firstName: 'Ana Maria' };
    caseFilesService.getWorkspace
      .mockReturnValueOnce(of(createWorkspace()))
      .mockReturnValue(of(refreshedWorkspace));
    dialog.open
      .mockReturnValueOnce({ afterClosed: () => of({ ...createPatient(), firstName: 'Ana Maria' }) })
      .mockReturnValueOnce({ afterClosed: () => of(true) });
    const component = createComponent({ caseFileId: 'case-file-1' });

    component.openEditPatientDialog();
    component.openEditCaseFileDialog();

    expect(component.patient().firstName).toBe('Ana Maria');
    expect(caseFilesService.getWorkspace).toHaveBeenCalledTimes(3);
  });

  it('refreshes the workspace once after a session note is created', () => {
    expectSessionNoteActionRefresh(
      (component) => component.openCreateSessionNoteDialog(),
      SessionNoteFormDialogComponent,
      { mode: 'create', caseFileId: 'case-file-1' }
    );
  });

  it('refreshes the workspace once after a session note is edited', () => {
    const sessionNote = createWorkspace().sessionNotes[0];

    expectSessionNoteActionRefresh(
      (component) => component.openEditSessionNoteDialog(sessionNote),
      SessionNoteFormDialogComponent,
      { mode: 'edit', caseFileId: 'case-file-1', sessionNote }
    );
  });

  it('refreshes the workspace once after a session note is deleted', () => {
    const sessionNote = createWorkspace().sessionNotes[0];

    expectSessionNoteActionRefresh(
      (component) => component.openDeleteSessionNoteDialog(sessionNote),
      SessionNoteDeleteDialogComponent,
      { sessionNote }
    );
  });

  it('does not refresh the workspace when session note dialogs close without success', () => {
    caseFilesService.getWorkspace.mockReturnValue(of(createWorkspace()));
    dialog.open.mockReturnValue({ afterClosed: () => of(false) });
    const component = createComponent({ caseFileId: 'case-file-1' });
    const sessionNote = createWorkspace().sessionNotes[0];

    component.openCreateSessionNoteDialog();
    component.openEditSessionNoteDialog(sessionNote);
    component.openDeleteSessionNoteDialog(sessionNote);

    expect(dialog.open).toHaveBeenCalledTimes(3);
    expect(caseFilesService.getWorkspace).toHaveBeenCalledTimes(1);
  });

  function expectSessionNoteActionRefresh(
    action: (component: PatientDetailDialogComponent) => void,
    expectedDialogComponent: unknown,
    expectedData: Record<string, unknown>
  ): void {
    caseFilesService.getWorkspace.mockReturnValue(of(createWorkspace()));
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    const component = createComponent({ caseFileId: 'case-file-1' });

    action(component);

    expect(dialog.open).toHaveBeenCalledWith(
      expectedDialogComponent,
      expect.objectContaining({ data: expectedData })
    );
    expect(caseFilesService.getWorkspace).toHaveBeenCalledTimes(2);
  }

  function createComponent(data: { caseFileId?: string } = {}): PatientDetailDialogComponent {
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { patient: createPatient(), ...data } },
        { provide: CaseFilesService, useValue: caseFilesService },
        { provide: AppointmentsService, useValue: { updateAppointment: vi.fn() } },
        { provide: MatDialog, useValue: dialog },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });

    return TestBed.runInInjectionContext(() => new PatientDetailDialogComponent());
  }
});

function createPatient(): Patient {
  return {
    id: 'patient-1',
    psychologistId: 'psychologist-1',
    firstName: 'Ana',
    lastName: 'Lopez',
    email: 'ana@example.com',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
}

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
    patient: createPatient(),
    summary: {
      appointmentsCount: 1,
      sessionNotesCount: 1,
      documentsCount: 1,
      lastActivityAt: '2026-07-02T09:00:00.000Z',
      nextAppointmentAt: '2026-07-03T09:00:00.000Z',
      lastAppointmentAt: '2026-07-02T09:00:00.000Z',
    },
    appointments: [
      {
        id: 'appointment-1',
        patientId: 'patient-1',
        psychologistId: 'psychologist-1',
        scheduledAt: '2026-07-03T09:00:00.000Z',
        durationMinutes: 50,
        status: 'SCHEDULED',
        createdAt: '2026-07-01T10:00:00.000Z',
        updatedAt: '2026-07-01T10:00:00.000Z',
      },
    ],
    sessionNotes: [
      {
        id: 'note-1',
        caseFileId: 'case-file-1',
        authorId: 'psychologist-1',
        title: 'Seguimiento',
        content: 'La paciente reporta mejoria.',
        sessionDate: '2026-07-02T09:00:00.000Z',
        createdAt: '2026-07-02T10:00:00.000Z',
        updatedAt: '2026-07-02T10:00:00.000Z',
      },
    ],
    documents: [
      {
        id: 'document-1',
        caseFileId: 'case-file-1',
        uploadedById: 'psychologist-1',
        fileName: 'consentimiento.pdf',
        filePath: 'documents/consentimiento.pdf',
        uploadedAt: '2026-07-02T10:00:00.000Z',
        updatedAt: '2026-07-02T10:00:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'timeline-1',
        type: 'SESSION_NOTE_CREATED',
        sourceType: 'SESSION_NOTE',
        sourceId: 'note-1',
        occurredAt: '2026-07-02T10:00:00.000Z',
      },
    ],
  };
}
