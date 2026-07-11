import { MatDialog } from '@angular/material/dialog';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { PatientDetailDialogComponent } from '../components/patient-detail-dialog.component';
import { Patient } from '../models/patient.models';
import { PatientsService } from '../services/patients.service';
import { PatientsListPage } from './patients-list.page';

describe('PatientsListPage', () => {
  let getPatients: ReturnType<typeof vi.fn<() => Observable<Patient[]>>>;
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    getPatients = vi.fn<() => Observable<Patient[]>>();
    dialog = { open: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: PatientsService, useValue: { getPatients } },
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
      expect.objectContaining({ data: { patient } })
    );
    expect(getPatients).toHaveBeenCalledTimes(2);
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
