import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AdministrationStatus } from '../../../../core/models/assessment.models';
import { InstrumentVersionStatus } from '../../../../core/models/instrument.models';
import { AssessmentsHttpService } from '../../../../core/services/assessments-http.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { InstrumentsHttpService } from '../../../../core/services/instruments-http.service';
import {
  AssessmentAssignDialogComponent,
  AssessmentAssignDialogData,
} from './assessment-assign-dialog.component';

describe('AssessmentAssignDialogComponent', () => {
  let component: AssessmentAssignDialogComponent;
  let fixture: ComponentFixture<AssessmentAssignDialogComponent>;

  const mockDialogData: AssessmentAssignDialogData = {
    patientId: 'pat-123',
    patientName: 'Juan Perez',
    branchId: 'br-1',
    caseFileId: 'cf-1',
  };

  const mockDialogRef = {
    close: vi.fn(),
  };

  const mockInstrumentsService = {
    getInstruments: vi.fn().mockReturnValue(
      of([
        {
          id: 'inst-1',
          code: 'PHQ-9',
          name: 'PHQ-9 Depresión',
          targetPopulation: 'Adultos',
          isSystem: true,
          versions: [
            {
              id: 'ver-1',
              versionNumber: 1,
              status: InstrumentVersionStatus.PUBLISHED,
              publishedAt: '2026-08-18T10:00:00Z',
            },
          ],
        },
      ]),
    ),
  };

  const mockBranchesService = {
    findAll: vi
      .fn()
      .mockReturnValue(
        of([{ id: 'br-1', name: 'Sucursal Central', code: 'SC01', isActive: true }]),
      ),
  };

  const mockAssessmentsService = {
    assignAssessment: vi.fn().mockReturnValue(
      of({
        id: 'adm-123',
        status: AdministrationStatus.ASSIGNED,
      }),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessmentAssignDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: InstrumentsHttpService, useValue: mockInstrumentsService },
        { provide: BranchesService, useValue: mockBranchesService },
        { provide: AssessmentsHttpService, useValue: mockAssessmentsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentAssignDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load catalog data', () => {
    expect(component).toBeTruthy();
    expect(component.instruments()).toHaveLength(1);
    expect(component.branches()).toHaveLength(1);
    expect(component.assignForm.controls.instrumentId.value).toBe('inst-1');
    expect(component.assignForm.controls.instrumentVersionId.value).toBe('ver-1');
  });

  it('should submit assign request and close dialog on success', () => {
    component.submit();

    expect(mockAssessmentsService.assignAssessment).toHaveBeenCalled();
    expect(mockDialogRef.close).toHaveBeenCalledWith(expect.objectContaining({ id: 'adm-123' }));
  });

  it('should close dialog with null when cancelled', () => {
    component.cancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(null);
  });
});
