import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AdministrationStatus, AssessmentAdministration } from '../models/assessment.models';
import { AssessmentsHttpService } from './assessments-http.service';

describe('AssessmentsHttpService', () => {
  let service: AssessmentsHttpService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AssessmentsHttpService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AssessmentsHttpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call POST /assessments/administrations to assign an assessment', () => {
    const payload = {
      patientId: 'p-1',
      instrumentVersionId: 'v-1',
      isRemoteSelfAdministered: true,
    };
    const mockRes: AssessmentAdministration = {
      id: 'adm-1',
      organizationId: 'org-1',
      patientId: 'p-1',
      professionalId: 'prof-1',
      instrumentVersionId: 'v-1',
      status: AdministrationStatus.ASSIGNED,
      createdAt: '2026-08-18T12:00:00Z',
      updatedAt: '2026-08-18T12:00:00Z',
    };

    service.assignAssessment(payload).subscribe((res) => {
      expect(res.id).toBe('adm-1');
      expect(res.status).toBe(AdministrationStatus.ASSIGNED);
    });

    const req = httpMock.expectOne(`${apiUrl}/assessments/administrations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockRes);
  });

  it('should call GET /assessments/administrations with query params', () => {
    const params = { patientId: 'p-1', status: 'COMPLETED', page: 1, limit: 10 };

    service.getAdministrations(params).subscribe((res) => {
      expect(res.data).toEqual([]);
      expect(res.meta.total).toBe(0);
    });

    const req = httpMock.expectOne((r) => r.url === `${apiUrl}/assessments/administrations`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('patientId')).toBe('p-1');
    expect(req.request.params.get('status')).toBe('COMPLETED');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } });
  });

  it('should call GET /assessments/public/runner/:accessToken for public runner', () => {
    const token = 'sec_eval_abc123';

    service.getPublicAssessmentRunner(token).subscribe((res) => {
      expect(res.id).toBe('adm-1');
    });

    const req = httpMock.expectOne(`${apiUrl}/assessments/public/runner/${token}`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'adm-1', status: AdministrationStatus.ASSIGNED });
  });

  it('should call PATCH /assessments/public/runner/:accessToken/responses for auto-save', () => {
    const token = 'sec_eval_abc123';
    const payload = { responses: { PHQ9_1: 2 } };

    service.savePublicResponses(token, payload).subscribe((res) => {
      expect(res.savedCount).toBe(1);
    });

    const req = httpMock.expectOne(`${apiUrl}/assessments/public/runner/${token}/responses`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    req.flush({
      administrationId: 'adm-1',
      status: 'IN_PROGRESS',
      savedCount: 1,
      totalAnswered: 1,
      message: 'Saved',
    });
  });

  it('should call POST /assessments/public/runner/:accessToken/complete for submission with payload', () => {
    const token = 'sec_eval_abc123';
    const payload = { responses: { PHQ9_1: 3 } };

    service.completePublicAssessment(token, payload).subscribe((res) => {
      expect(res.status).toBe(AdministrationStatus.COMPLETED);
    });

    const req = httpMock.expectOne(`${apiUrl}/assessments/public/runner/${token}/complete`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      administrationId: 'adm-1',
      status: AdministrationStatus.COMPLETED,
      completedAt: '2026-08-18T12:00:00Z',
      result: { rawScore: 14 },
    });
  });
});
