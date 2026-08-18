import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import {
  AdministrationStatus,
  AssessmentAdministration,
} from '../../../../core/models/assessment.models';
import { AssessmentsHttpService } from '../../../../core/services/assessments-http.service';
import { AssessmentRunnerPage } from './assessment-runner.page';

describe('AssessmentRunnerPage', () => {
  let component: AssessmentRunnerPage;
  let fixture: ComponentFixture<AssessmentRunnerPage>;

  const mockAdmin: AssessmentAdministration = {
    id: 'adm-100',
    organizationId: 'org-1',
    patientId: 'pat-1',
    professionalId: 'prof-1',
    instrumentVersionId: 'ver-1',
    status: AdministrationStatus.ASSIGNED,
    accessToken: 'sec_eval_valid123',
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-08-18T10:00:00Z',
    patient: {
      id: 'pat-1',
      firstName: 'María',
      lastName: 'López',
    },
    instrumentVersion: {
      id: 'ver-1',
      versionNumber: 1,
      definitionJson: {
        schemaVersion: '1.0',
        metadata: {
          title: 'PHQ-9 Depresión',
          acronym: 'PHQ-9',
          language: 'es-MX',
        },
        instructions: {
          generalInstructions: 'Responda con honestidad.',
        },
        items: [
          {
            code: 'PHQ9_1',
            sequenceNumber: 1,
            prompt: 'Poco interés o alegría',
            itemType: 'LIKERT',
            required: true,
            options: [
              { value: '0', label: 'Nunca', weight: 0 },
              { value: '1', label: 'Varios días', weight: 1 },
              { value: '2', label: 'Más de la mitad de los días', weight: 2 },
              { value: '3', label: 'Casi todos los días', weight: 3 },
            ],
          },
          {
            code: 'PHQ9_2',
            sequenceNumber: 2,
            prompt: 'Sensación de decaimiento',
            itemType: 'LIKERT',
            required: true,
            options: [
              { value: '0', label: 'Nunca', weight: 0 },
              { value: '1', label: 'Varios días', weight: 1 },
            ],
          },
        ],
      },
    },
    responses: [],
  };

  const mockAssessmentsService = {
    getPublicAssessmentRunner: vi.fn().mockReturnValue(of(mockAdmin)),
    savePublicResponses: vi.fn().mockReturnValue(
      of({
        administrationId: 'adm-100',
        status: 'IN_PROGRESS',
        savedCount: 1,
        totalAnswered: 1,
        message: 'Saved',
      }),
    ),
    completePublicAssessment: vi.fn().mockReturnValue(
      of({
        administrationId: 'adm-100',
        status: AdministrationStatus.COMPLETED,
        completedAt: '2026-08-18T10:15:00Z',
        result: { rawScore: 3 },
      }),
    ),
  };

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'accessToken' ? 'sec_eval_valid123' : null),
      },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessmentRunnerPage],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: AssessmentsHttpService, useValue: mockAssessmentsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentRunnerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load assessment details', () => {
    expect(component).toBeTruthy();
    expect(mockAssessmentsService.getPublicAssessmentRunner).toHaveBeenCalledWith(
      'sec_eval_valid123',
    );
    expect(component.items()).toHaveLength(2);
    expect(component.totalRequiredItems()).toBe(2);
    expect(component.progressPercentage()).toBe(0);
  });

  it('should update response and progress when option is selected', () => {
    component.selectOption('PHQ9_1', '2');
    expect(component.responses()['PHQ9_1']).toBe('2');
    expect(component.answeredRequiredCount()).toBe(1);
    expect(component.progressPercentage()).toBe(50);
  });

  it('should prevent submission and highlight missing items if incomplete', () => {
    component.selectOption('PHQ9_1', '2');
    // PHQ9_2 still missing
    component.submitAssessment();

    expect(component.missingItemCodes()).toContain('PHQ9_2');
    expect(mockAssessmentsService.completePublicAssessment).not.toHaveBeenCalled();
  });

  it('should complete assessment when all required items are answered', () => {
    component.selectOption('PHQ9_1', '2');
    component.selectOption('PHQ9_2', '1');

    component.submitAssessment();

    expect(mockAssessmentsService.completePublicAssessment).toHaveBeenCalledWith(
      'sec_eval_valid123',
    );
    expect(component.isCompleted()).toBe(true);
  });
});
