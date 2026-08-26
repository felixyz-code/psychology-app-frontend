import { MatDialog } from '@angular/material/dialog';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { PatientDetailDialogComponent } from '../components/patient-detail-dialog.component';
import { Patient } from '../models/patient.models';
import { PatientsService } from '../services/patients.service';
import { PatientsListPage } from './patients-list.page';

import { CaseFilesService } from '../../case-files/services/case-files.service';
import { ClinicalDocumentPreviewDialogComponent } from '../../case-files/components/clinical-document-preview-dialog.component';

describe('PatientsListPage', () => {
  let getPatients: ReturnType<typeof vi.fn<() => Observable<Patient[]>>>;
  let dialog: { open: ReturnType<typeof vi.fn> };
  let caseFilesService: {
    getCaseFileByPatientId: ReturnType<typeof vi.fn>;
    getClinicalPdfData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    getPatients = vi.fn<() => Observable<Patient[]>>();
    dialog = { open: vi.fn() };
    caseFilesService = {
      getCaseFileByPatientId: vi.fn(() => of({ id: 'case-1', patientId: 'patient-1' })),
      getClinicalPdfData: vi.fn(() => of({ caseFile: { id: 'case-1' } })),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PatientsService, useValue: { getPatients } },
        { provide: CaseFilesService, useValue: caseFilesService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads patients into its public state', () => {
    getPatients.mockReturnValue(of([createPatient()]));

    const page = createPage();

    expect(getPatients).toHaveBeenCalledTimes(1);
    expect(page.patients()).toEqual([createPatient()]);
    expect(page.isLoading()).toBe(false);
    expect(page.errorMessage()).toBe('');
  });

  it('exposes an error state when the patient load fails', () => {
    getPatients.mockReturnValue(throwError(() => new Error('Unavailable')));

    const page = createPage();

    expect(page.patients()).toEqual([]);
    expect(page.isLoading()).toBe(false);
    expect(page.errorMessage()).toBe('No fue posible cargar los pacientes.');
  });

  it('opens the clinical workspace and reloads after its edit flow completes', () => {
    const patient = createPatient();
    getPatients.mockReturnValue(of([patient]));
    dialog.open
      .mockReturnValueOnce({ afterClosed: () => of({ action: 'edit', patient }) })
      .mockReturnValueOnce({ afterClosed: () => of(true) });
    const page = createPage();

    page.openPatientDetailDialog(patient);

    expect(dialog.open).toHaveBeenNthCalledWith(
      1,
      PatientDetailDialogComponent,
      expect.objectContaining({ data: { patient } }),
    );
    expect(getPatients).toHaveBeenCalledTimes(2);
  });

  it('updates clinical status and therapist filters and exports summary PDF', () => {
    const patient = createPatient();
    getPatients.mockReturnValue(of([patient]));
    const page = createPage();

    page.setClinicalStatusFilter('ACTIVE');
    expect(page.clinicalStatusFilter()).toBe('ACTIVE');

    page.setTherapistFilter('psychologist-1');
    expect(page.therapistFilter()).toBe('psychologist-1');
    expect(page.patientsTableResult().totalFilteredItems).toBe(1);

    page.setTherapistFilter('other-psychologist');
    expect(page.patientsTableResult().totalFilteredItems).toBe(0);

    page.clearPatientFilters();
    expect(page.clinicalStatusFilter()).toBe('ALL');
    expect(page.therapistFilter()).toBe('ALL');
    expect(page.patientsTableResult().totalFilteredItems).toBe(1);

    page.exportPatientSummary(patient);
    expect(caseFilesService.getCaseFileByPatientId).toHaveBeenCalledWith('patient-1');
    expect(caseFilesService.getClinicalPdfData).toHaveBeenCalledWith('case-1');
    expect(dialog.open).toHaveBeenCalledWith(
      ClinicalDocumentPreviewDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({ initialDocumentType: 'CASE_FILE_SUMMARY' }),
      }),
    );
  });

  function createPage(): PatientsListPage {
    return TestBed.runInInjectionContext(() => new PatientsListPage());
  }
});

function createPatient(): Patient {
  return {
    id: 'patient-1',
    psychologistId: 'psychologist-1',
    firstName: 'Ana',
    lastName: 'Lopez',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
}
