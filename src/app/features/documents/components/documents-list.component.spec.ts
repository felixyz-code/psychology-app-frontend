import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { CaseFilesService } from '../../case-files/services/case-files.service';
import { PatientsService } from '../../patients/services/patients.service';
import { DocumentsService } from '../services/documents.service';
import { DocumentsListComponent } from './documents-list.component';

describe('DocumentsListComponent', () => {
  let caseFilesService: { getCaseFiles: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };
  let documentsService: {
    download: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    getByCaseFile: ReturnType<typeof vi.fn>;
  };
  let patientsService: { getPatients: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    caseFilesService = { getCaseFiles: vi.fn(() => of([createCaseFile()])) };
    dialog = { open: vi.fn(() => ({ afterClosed: () => of(false) })) };
    documentsService = {
      download: vi.fn(),
      getAll: vi.fn(() => of([createDocument()])),
      getByCaseFile: vi.fn(() => of([createDocument()])),
    };
    patientsService = { getPatients: vi.fn(() => of([createPatient()])) };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads the global list and resolves patient names from case files and patients', () => {
    const { component } = createComponent();

    expect(documentsService.getAll).toHaveBeenCalledTimes(1);
    expect(component.isLoading()).toBe(false);
    expect(component.documents()).toEqual([createDocument()]);
    expect(component.getPatientName(createDocument())).toBe('Ana Lopez');
    expect(component.displayedColumns()).toContain('patient');
  });

  it('loads the case-file list when a case file scope is selected', () => {
    const { component, fixture } = createComponent();
    fixture.componentRef.setInput('scope', 'case-file');
    fixture.componentRef.setInput('caseFileId', 'case-file-1');
    fixture.detectChanges();

    expect(documentsService.getByCaseFile).toHaveBeenCalledWith('case-file-1');
    expect(component.documents()).toEqual([createDocument()]);
    expect(component.displayedColumns()).not.toContain('patient');
  });

  it('shows an empty local state and error when documents cannot load', () => {
    documentsService.getAll.mockReturnValue(throwError(() => new Error('Unavailable')));
    const loaded = vi.fn();
    const { component } = createComponent();
    component.documentsLoaded.subscribe(loaded);
    const changes = vi.fn();
    component.documentsChanged.subscribe(changes);

    component.loadDocuments();

    expect(component.documents()).toEqual([]);
    expect(component.errorMessage()).toBe('No fue posible cargar los documentos.');
    expect(component.isLoading()).toBe(false);
    expect(loaded).toHaveBeenCalledWith([]);
    expect(changes).not.toHaveBeenCalled();
  });

  it.each([
    ['upload', (component: DocumentsListComponent) => component.openUploadDialog()],
    ['delete', (component: DocumentsListComponent) => component.openDeleteDialog(createDocument())],
    ['metadata edit', (component: DocumentsListComponent) => component.openEditDialog(createDocument())],
  ])('refreshes the local list after a successful %s dialog mutation', (_operation, mutate) => {
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    const { component } = createComponent();
    const initialGetAllCalls = documentsService.getAll.mock.calls.length;

    mutate(component);

    expect(documentsService.getAll).toHaveBeenCalledTimes(initialGetAllCalls + 1);
  });

  it('emits documentsChanged for a successful workspace mutation without local refresh', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    const { component, fixture } = createComponent();
    fixture.componentRef.setInput('items', [createDocument()]);
    fixture.detectChanges();
    const changes = vi.fn();
    component.documentsChanged.subscribe(changes);
    const initialGetAllCalls = documentsService.getAll.mock.calls.length;

    component.openDeleteDialog(createDocument());

    expect(changes).toHaveBeenCalledTimes(1);
    expect(documentsService.getAll).toHaveBeenCalledTimes(initialGetAllCalls);
  });

  it('does not refresh or emit for a cancelled workspace dialog result', () => {
    const result = () => of(false);
    dialog.open.mockReturnValue({ afterClosed: result });
    const { component, fixture } = createComponent();
    fixture.componentRef.setInput('items', [createDocument()]);
    fixture.detectChanges();
    const changes = vi.fn();
    component.documentsChanged.subscribe(changes);
    const initialGetAllCalls = documentsService.getAll.mock.calls.length;

    component.openUploadDialog();

    expect(changes).not.toHaveBeenCalled();
    expect(documentsService.getAll).toHaveBeenCalledTimes(initialGetAllCalls);
  });

  it('does not request documents for an incomplete case-file scope', () => {
    const { component, fixture } = createComponent();
    fixture.componentRef.setInput('scope', 'case-file');
    fixture.componentRef.setInput('caseFileId', null);
    fixture.detectChanges();

    expect(component.documents()).toEqual([]);
    expect(component.isLoading()).toBe(false);
  });

  function createComponent(): { component: DocumentsListComponent; fixture: ComponentFixture<DocumentsListComponent> } {
    TestBed.overrideComponent(DocumentsListComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }] },
    });
    TestBed.configureTestingModule({
      imports: [DocumentsListComponent],
      providers: [
        { provide: CaseFilesService, useValue: caseFilesService },
        { provide: DocumentsService, useValue: documentsService },
        { provide: MatDialog, useValue: dialog },
        { provide: PatientsService, useValue: patientsService },
      ],
    });

    const fixture = TestBed.createComponent(DocumentsListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture };
  }
});

function createDocument() {
  return {
    id: 'document-1',
    caseFileId: 'case-file-1',
    uploadedById: 'psychologist-1',
    fileName: 'informe.pdf',
    filePath: 'documents/informe.pdf',
    mimeType: 'application/pdf',
    uploadedAt: '2026-07-02T10:00:00.000Z',
    updatedAt: '2026-07-02T10:00:00.000Z',
  };
}

function createCaseFile() {
  return {
    id: 'case-file-1',
    patientId: 'patient-1',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
}

function createPatient() {
  return {
    id: 'patient-1',
    psychologistId: 'psychologist-1',
    firstName: 'Ana',
    lastName: 'Lopez',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
}
