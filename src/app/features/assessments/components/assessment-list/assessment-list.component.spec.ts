import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import {
  AdministrationStatus,
  AssessmentAdministration,
} from '../../../../core/models/assessment.models';
import { AssessmentsHttpService } from '../../../../core/services/assessments-http.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AssessmentListComponent } from './assessment-list.component';

describe('AssessmentListComponent', () => {
  let component: AssessmentListComponent;
  let fixture: ComponentFixture<AssessmentListComponent>;

  const mockAssessments: AssessmentAdministration[] = [
    {
      id: 'adm-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      professionalId: 'prof-1',
      instrumentVersionId: 'ver-1',
      status: AdministrationStatus.COMPLETED,
      accessToken: 'sec_eval_token123',
      createdAt: '2026-08-18T10:00:00Z',
      updatedAt: '2026-08-18T10:30:00Z',
      completedAt: '2026-08-18T10:30:00Z',
      instrumentVersion: {
        id: 'ver-1',
        versionNumber: 1,
        instrument: {
          id: 'inst-1',
          code: 'PHQ-9',
          name: 'Cuestionario de Salud del Paciente',
        },
      },
      result: {
        id: 'res-1',
        administrationId: 'adm-1',
        rawScore: 14,
        strataTitle: 'Depresión Moderada',
        severity: 'MODERATE',
        scoringSpecSnapshotJson: {},
        createdAt: '2026-08-18T10:30:00Z',
        flagsJson: [{ code: 'SUICIDE_RISK_ALERT', title: 'Riesgo Suicida' }],
      },
    },
  ];

  const mockAssessmentsService = {
    getAdministrations: vi.fn().mockReturnValue(
      of({
        data: mockAssessments,
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      }),
    ),
    getLongitudinalSeries: vi.fn().mockReturnValue(
      of({
        patientId: 'pat-1',
        patientName: 'Juan Perez',
        instrumentCode: null,
        series: [],
        summary: {
          totalCompletedAssessments: 0,
          firstAssessmentAt: null,
          lastAssessmentAt: null,
          scoreMin: null,
          scoreMax: null,
          scoreAverage: null,
          scoreTrend: 'INSUFFICIENT_DATA',
          severityDistribution: {},
        },
      }),
    ),
  };

  const mockDialog = {
    open: vi.fn().mockReturnValue({
      afterClosed: () => of(true),
    }),
  };

  const mockToastService = {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessmentListComponent],
      providers: [
        { provide: AssessmentsHttpService, useValue: mockAssessmentsService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentListComponent);
    component = fixture.componentInstance;
    component.patientId = 'pat-1';
    component.patientName = 'Juan Perez';
    fixture.detectChanges();
  });

  it('should create and load assessments list', () => {
    expect(component).toBeTruthy();
    expect(mockAssessmentsService.getAdministrations).toHaveBeenCalledWith({
      patientId: 'pat-1',
      limit: 50,
    });
    expect(component.assessments()).toHaveLength(1);
  });

  it('should correctly detect risk flags', () => {
    expect(component.hasRiskFlags(mockAssessments[0])).toBe(true);
  });

  it('should open assign dialog when triggered', () => {
    component.openAssignDialog();
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should open results dialog when viewing results', () => {
    component.openResultDialog(mockAssessments[0]);
    expect(mockDialog.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: { administration: mockAssessments[0] },
      }),
    );
  });
});
