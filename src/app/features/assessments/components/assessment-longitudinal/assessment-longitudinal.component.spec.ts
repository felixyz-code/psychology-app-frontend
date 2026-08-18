import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AssessmentLongitudinalComponent } from './assessment-longitudinal.component';
import { AssessmentsHttpService } from '../../../../core/services/assessments-http.service';
import { LongitudinalAssessmentSeriesDto } from '../../../../core/models/assessment.models';

describe('AssessmentLongitudinalComponent', () => {
  let component: AssessmentLongitudinalComponent;
  let fixture: ComponentFixture<AssessmentLongitudinalComponent>;
  let mockAssessmentsHttp: {
    getLongitudinalSeries: (patientId: string, params?: any) => any;
  };

  const mockSeries: LongitudinalAssessmentSeriesDto = {
    patientId: 'pat-100',
    patientName: 'Carlos Ramirez',
    instrumentCode: 'PHQ-9',
    series: [
      {
        administrationId: 'adm-1',
        instrumentCode: 'PHQ-9',
        instrumentName: 'Patient Health Questionnaire-9',
        versionNumber: 1,
        completedAt: '2026-06-18T10:00:00.000Z',
        rawScore: 18,
        normalizedScore: 66.7,
        strataCode: 'SEVERE',
        strataTitle: 'Depresión Severa',
        severity: 'SEVERE',
        delta: null,
        activeCriticalAlerts: 1,
        hasRiskFlag: true,
        subscaleSummary: [],
      },
      {
        administrationId: 'adm-2',
        instrumentCode: 'PHQ-9',
        instrumentName: 'Patient Health Questionnaire-9',
        versionNumber: 1,
        completedAt: '2026-08-18T10:00:00.000Z',
        rawScore: 12,
        normalizedScore: 44.4,
        strataCode: 'MODERATE',
        strataTitle: 'Depresión Moderada',
        severity: 'MODERATE',
        delta: {
          previousAdministrationId: 'adm-1',
          rawScoreDelta: -6,
          severityChange: 'IMPROVED',
          clinicalSignificance: 'CLINICALLY_SIGNIFICANT',
        },
        activeCriticalAlerts: 0,
        hasRiskFlag: false,
        subscaleSummary: [],
      },
    ],
    summary: {
      totalCompletedAssessments: 2,
      firstAssessmentAt: '2026-06-18T10:00:00.000Z',
      lastAssessmentAt: '2026-08-18T10:00:00.000Z',
      scoreMin: 12,
      scoreMax: 18,
      scoreAverage: 15,
      scoreTrend: 'IMPROVING',
      severityDistribution: { SEVERE: 1, MODERATE: 1 },
    },
  };

  beforeEach(async () => {
    mockAssessmentsHttp = {
      getLongitudinalSeries: () => of(mockSeries),
    };

    await TestBed.configureTestingModule({
      imports: [AssessmentLongitudinalComponent],
      providers: [
        { provide: AssessmentsHttpService, useValue: mockAssessmentsHttp },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentLongitudinalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.patientId = 'pat-100';
    expect(component).toBeTruthy();
  });

  it('should load longitudinal series on init', () => {
    component.patientId = 'pat-100';
    fixture.detectChanges();

    expect(component.seriesData()).toEqual(mockSeries);
    expect(component.loading()).toBe(false);
  });
});
