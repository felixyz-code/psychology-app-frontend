import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  AdministrationStatus,
  AssessmentAdministration,
} from '../../../../core/models/assessment.models';
import {
  AssessmentResultDialogComponent,
  AssessmentResultDialogData,
} from './assessment-result-dialog.component';

describe('AssessmentResultDialogComponent', () => {
  let component: AssessmentResultDialogComponent;
  let fixture: ComponentFixture<AssessmentResultDialogComponent>;

  const mockAdmin: AssessmentAdministration = {
    id: 'adm-1',
    organizationId: 'org-1',
    patientId: 'pat-1',
    professionalId: 'prof-1',
    instrumentVersionId: 'ver-1',
    status: AdministrationStatus.COMPLETED,
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-08-18T10:30:00Z',
    completedAt: '2026-08-18T10:30:00Z',
    patient: {
      id: 'pat-1',
      firstName: 'Juan',
      lastName: 'Perez',
    },
    instrumentVersion: {
      id: 'ver-1',
      versionNumber: 1,
      instrument: {
        id: 'inst-1',
        code: 'PHQ-9',
        name: 'Cuestionario de Salud del Paciente',
      },
    },
    responses: [
      {
        id: 'r-1',
        administrationId: 'adm-1',
        itemCode: 'PHQ9_1',
        responseValue: 3,
        numericWeight: 3,
        createdAt: '2026-08-18T10:10:00Z',
        updatedAt: '2026-08-18T10:10:00Z',
      },
    ],
    result: {
      id: 'res-1',
      administrationId: 'adm-1',
      rawScore: 18,
      normalizedScore: null,
      strataCode: 'SEVERE',
      strataTitle: 'Depresión Severa',
      severity: 'SEVERE',
      subscaleScoresJson: { SOMATIC: 8, COGNITIVE: 10 },
      flagsJson: [
        {
          code: 'SUICIDE_RISK_ALERT',
          title: 'Alerta de Riesgo Suicida',
          message: 'Puntuó en ítem 9',
        },
      ],
      scoringSpecSnapshotJson: {},
      createdAt: '2026-08-18T10:30:00Z',
    },
  };

  const mockDialogData: AssessmentResultDialogData = {
    administration: mockAdmin,
  };

  const mockDialogRef = {
    close: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessmentResultDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentResultDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render result data', () => {
    expect(component).toBeTruthy();
    expect(component.result?.rawScore).toBe(18);
    expect(component.getSeverityVariant(component.result?.severity)).toBe('danger');
    expect(component.getFlags()).toHaveLength(1);
    expect(component.getSubscales()).toHaveLength(2);
  });

  it('should close dialog when requested', () => {
    component.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
