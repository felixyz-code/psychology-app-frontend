import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PsychometricReportViewComponent } from './psychometric-report-view.component';
import { AssessmentsHttpService } from '../../../../core/services/assessments-http.service';
import { PsychometricReportDto } from '../../../../core/models/assessment.models';

describe('PsychometricReportViewComponent', () => {
  let component: PsychometricReportViewComponent;
  let fixture: ComponentFixture<PsychometricReportViewComponent>;
  let mockAssessmentsHttp: {
    getPsychometricReport: (id: string) => any;
  };

  const mockReport: PsychometricReportDto = {
    reportGeneratedAt: '2026-08-18T12:00:00.000Z',
    reportVersion: '1.0',
    organization: {
      id: 'org-1',
      legalName: 'Clinica Psiquiatrica Test',
      displayName: 'Clinica Test',
      slug: 'clinica-test',
      primaryColor: '#2563eb',
      accentColor: null,
      logoUrl: null,
    },
    branch: {
      id: 'b-1',
      name: 'Sucursal Central',
      code: 'CENTRAL',
      address: 'Av. Hidalgo 123',
      phone: '555-0192',
      timezone: 'America/Mexico_City',
    },
    professional: {
      id: 'prof-1',
      name: 'Dr. Maria Lopez',
      email: 'maria@test.com',
      professionalName: 'Dra. María López Méndez',
      licenseNumber: '12345678',
    },
    patient: {
      id: 'pat-1',
      firstName: 'Juan',
      lastName: 'Perez',
      fullName: 'Juan Perez',
      email: 'juan@test.com',
      birthDate: '1985-03-15',
      age: 41,
    },
    instrument: {
      id: 'inst-1',
      code: 'PHQ-9',
      name: 'Patient Health Questionnaire-9',
      acronym: 'PHQ-9',
      author: 'Kroenke et al.',
      targetPopulation: 'Adults',
      versionNumber: 1,
      administrationMode: 'SELF_ADMINISTERED',
      estimatedTimeMinutes: 5,
    },
    administration: {
      id: 'adm-1',
      assignedAt: '2026-08-18T10:00:00.000Z',
      startedAt: '2026-08-18T10:05:00.000Z',
      completedAt: '2026-08-18T10:12:00.000Z',
      durationMinutes: 7,
    },
    result: {
      rawScore: 14,
      normalizedScore: 51.9,
      strataCode: 'MODERATE',
      strataTitle: 'Depresión Moderada',
      severity: 'MODERATE',
      strataDescription: 'Indicativo de depresión moderada.',
      minPossibleScore: 0,
      maxPossibleScore: 27,
      subscales: [],
      clinicalAlerts: [],
      scoringSpecSnapshot: {},
    },
    itemResponses: [],
    legalDisclaimer: 'DESCARGO LEGAL PRUEBA NOM-004',
  };

  beforeEach(async () => {
    mockAssessmentsHttp = {
      getPsychometricReport: () => of(mockReport),
    };

    await TestBed.configureTestingModule({
      imports: [PsychometricReportViewComponent],
      providers: [
        { provide: AssessmentsHttpService, useValue: mockAssessmentsHttp },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PsychometricReportViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load report on init if administrationId is provided', () => {
    component.administrationId = 'adm-1';
    fixture.detectChanges();

    expect(component.report()).toEqual(mockReport);
    expect(component.loading()).toBe(false);
  });
});
