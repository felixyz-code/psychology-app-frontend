import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { CaseFilesService } from '../../case-files/services/case-files.service';
import { PatientsService } from '../../patients/services/patients.service';
import { DocumentsService } from './documents.service';
import { DocumentUploadFlowStore } from './document-upload-flow.store';

describe('DocumentUploadFlowStore', () => {
  let caseFilesService: { getCaseFiles: ReturnType<typeof vi.fn> };
  let documentsService: { upload: ReturnType<typeof vi.fn> };
  let patientsService: { getPatients: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    caseFilesService = { getCaseFiles: vi.fn() };
    documentsService = { upload: vi.fn() };
    patientsService = { getPatients: vi.fn() };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('starts with a pending options load and no save or error state', () => {
    const store = createStore();

    expect(store.isSaving()).toBe(false);
    expect(store.errorMessage()).toBe('');
    expect(store.isCaseFilesLoading()).toBe(true);
    expect(store.caseFilesLoadErrorMessage()).toBe('');
    expect(store.caseFileOptions()).toEqual([]);
  });

  it('loads sorted case-file options with their patient names', () => {
    caseFilesService.getCaseFiles.mockReturnValue(
      of([
        { id: 'case-file-2', patientId: 'patient-2', createdAt: '2026-07-02T10:00:00.000Z', updatedAt: '2026-07-02T10:00:00.000Z' },
        { id: 'case-file-1', patientId: 'patient-1', createdAt: '2026-07-01T10:00:00.000Z', updatedAt: '2026-07-01T10:00:00.000Z' },
      ])
    );
    patientsService.getPatients.mockReturnValue(
      of([
        { id: 'patient-1', psychologistId: 'psychologist-1', firstName: 'Ana', lastName: 'Lopez', createdAt: '', updatedAt: '' },
        { id: 'patient-2', psychologistId: 'psychologist-1', firstName: 'Beto', lastName: 'Diaz', createdAt: '', updatedAt: '' },
      ])
    );
    const store = createStore();

    store.loadCaseFileOptions();

    expect(store.isCaseFilesLoading()).toBe(false);
    expect(store.caseFilesLoadErrorMessage()).toBe('');
    expect(store.caseFileOptions().map((option) => option.value)).toEqual(['case-file-1', 'case-file-2']);
    expect(store.caseFileOptions()[0].label).toContain('Ana Lopez');
  });

  it('exposes an options error and clears options when either source fails', () => {
    caseFilesService.getCaseFiles.mockReturnValue(throwError(() => new Error('Unavailable')));
    patientsService.getPatients.mockReturnValue(of([]));
    const store = createStore();

    store.loadCaseFileOptions();

    expect(store.isCaseFilesLoading()).toBe(false);
    expect(store.caseFileOptions()).toEqual([]);
    expect(store.caseFilesLoadErrorMessage()).toBe('No fue posible cargar los expedientes disponibles.');
  });

  it('configures a fixed case file without loading global options', () => {
    const store = createStore();

    store.configureFixedCaseFile('case-file-1');

    expect(store.fixedCaseFileId()).toBe('case-file-1');
    expect(store.isCaseFilesLoading()).toBe(false);
    expect(store.caseFileOptions()).toEqual([]);
  });

  it('uploads successfully, clears saving state, and calls the success callback', () => {
    documentsService.upload.mockReturnValue(of({}));
    const onSuccess = vi.fn();
    const store = createStore();
    const file = new File(['content'], 'informe.pdf', { type: 'application/pdf' });

    store.submit({ caseFileId: 'case-file-1', file }, onSuccess);

    expect(documentsService.upload).toHaveBeenCalledWith('case-file-1', file);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(store.isSaving()).toBe(false);
    expect(store.errorMessage()).toBe('');
  });

  it('shows an upload error, permits retry, and does not call success for a failed request', () => {
    documentsService.upload.mockReturnValueOnce(throwError(() => new Error('Unavailable'))).mockReturnValueOnce(of({}));
    const onSuccess = vi.fn();
    const store = createStore();
    const payload = { caseFileId: 'case-file-1', file: new File(['content'], 'informe.pdf') };

    store.submit(payload, onSuccess);

    expect(store.isSaving()).toBe(false);
    expect(store.errorMessage()).toBe('No fue posible subir el documento.');
    expect(onSuccess).not.toHaveBeenCalled();

    store.submit(payload, onSuccess);

    expect(documentsService.upload).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('prevents a double submit while the upload is pending', () => {
    const pendingRequest = new Subject<unknown>();
    documentsService.upload.mockReturnValue(pendingRequest);
    const store = createStore();
    const payload = { caseFileId: 'case-file-1', file: new File(['content'], 'informe.pdf') };

    store.submit(payload, vi.fn());
    store.submit(payload, vi.fn());

    expect(documentsService.upload).toHaveBeenCalledTimes(1);
    expect(store.isSaving()).toBe(true);

    pendingRequest.complete();
    expect(store.isSaving()).toBe(false);
  });

  function createStore(): DocumentUploadFlowStore {
    TestBed.configureTestingModule({
      providers: [
        DocumentUploadFlowStore,
        { provide: CaseFilesService, useValue: caseFilesService },
        { provide: DocumentsService, useValue: documentsService },
        { provide: PatientsService, useValue: patientsService },
      ],
    });

    return TestBed.inject(DocumentUploadFlowStore);
  }
});
