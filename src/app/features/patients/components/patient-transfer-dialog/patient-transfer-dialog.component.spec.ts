import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { BranchesService } from '../../../../core/services/branches.service';
import { Patient } from '../../models/patient.models';
import { PatientsService } from '../../services/patients.service';
import {
  PatientTransferDialogComponent,
  PatientTransferDialogData,
} from './patient-transfer-dialog.component';

describe('PatientTransferDialogComponent', () => {
  let component: PatientTransferDialogComponent;
  let fixture: ComponentFixture<PatientTransferDialogComponent>;
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };
  let branchesServiceSpy: {
    findAll: ReturnType<typeof vi.fn>;
    getBranchProfessionals: ReturnType<typeof vi.fn>;
  };
  let patientsServiceSpy: {
    transferPatient: ReturnType<typeof vi.fn>;
  };

  const mockPatient: Patient = {
    id: 'patient-123',
    psychologistId: 'psychologist-1',
    firstName: 'Carlos',
    lastName: 'Gomez',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockBranches = [
    { id: 'branch-1', name: 'Sede Norte', code: 'NORTE', isActive: true },
    { id: 'branch-2', name: 'Sede Sur', code: 'SUR', isActive: true },
  ];

  const mockProfessionals = [
    {
      id: 'sched-1',
      organizationId: 'org-1',
      branchId: 'branch-2',
      userId: 'psychologist-2',
      isPrimary: true,
      user: {
        id: 'psychologist-2',
        displayName: 'Dra. Maria Perez',
        email: 'maria@example.com',
      },
      schedules: [],
    },
  ];

  beforeEach(async () => {
    dialogRefSpy = { close: vi.fn() };
    branchesServiceSpy = {
      findAll: vi.fn().mockReturnValue(of(mockBranches)),
      getBranchProfessionals: vi.fn().mockReturnValue(of(mockProfessionals)),
    };
    patientsServiceSpy = {
      transferPatient: vi.fn().mockReturnValue(of({ ...mockPatient, branchId: 'branch-2' })),
    };

    const dialogData: PatientTransferDialogData = {
      patient: mockPatient,
    };

    await TestBed.configureTestingModule({
      imports: [PatientTransferDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: BranchesService, useValue: branchesServiceSpy },
        { provide: PatientsService, useValue: patientsServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientTransferDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes and loads active branches', () => {
    expect(branchesServiceSpy.findAll).toHaveBeenCalledWith({ includeInactive: false });
    expect(component.branches().length).toBe(2);
    expect(component.isLoadingBranches()).toBe(false);
  });

  it('loads professionals when branch selection changes', () => {
    component.onBranchChange('branch-2');
    expect(branchesServiceSpy.getBranchProfessionals).toHaveBeenCalledWith('branch-2');
    expect(component.professionals().length).toBe(1);
  });

  it('submits valid transfer and closes dialog with true', () => {
    component.form.patchValue({
      targetBranchId: 'branch-2',
      targetPsychologistId: 'psychologist-2',
      reason: 'Reubicación de paciente a sucursal Sur.',
    });

    component.onSubmit();

    expect(patientsServiceSpy.transferPatient).toHaveBeenCalledWith('patient-123', {
      targetBranchId: 'branch-2',
      targetPsychologistId: 'psychologist-2',
      reason: 'Reubicación de paciente a sucursal Sur.',
    });
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('does not submit when form is invalid', () => {
    component.form.patchValue({
      targetBranchId: '',
      reason: '',
    });

    component.onSubmit();

    expect(patientsServiceSpy.transferPatient).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('closes dialog with false on cancel', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
