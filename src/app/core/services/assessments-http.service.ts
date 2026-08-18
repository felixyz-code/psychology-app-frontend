import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssessmentAdministration,
  AssessmentAdministrationListResponse,
  AssignAssessmentRequest,
  CompleteAssessmentResponse,
  LongitudinalAssessmentSeriesDto,
  PsychometricReportDto,
  SaveResponsesRequest,
} from '../models/assessment.models';

export interface SaveResponsesResponse {
  administrationId: string;
  status: string;
  savedCount: number;
  totalAnswered: number;
  message: string;
}

export interface QueryLongitudinalParams {
  instrumentCode?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface QueryAdministrationsParams {
  patientId?: string;
  professionalId?: string;
  status?: string;
  instrumentCode?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class AssessmentsHttpService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // --- Clinician Authenticated Operations ---

  assignAssessment(payload: AssignAssessmentRequest): Observable<AssessmentAdministration> {
    return this.http.post<AssessmentAdministration>(
      `${this.apiUrl}/assessments/administrations`,
      payload,
    );
  }

  getAdministrations(
    params?: QueryAdministrationsParams,
  ): Observable<AssessmentAdministrationListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.patientId) httpParams = httpParams.set('patientId', params.patientId);
      if (params.professionalId)
        httpParams = httpParams.set('professionalId', params.professionalId);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.instrumentCode)
        httpParams = httpParams.set('instrumentCode', params.instrumentCode);
      if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
      if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<AssessmentAdministrationListResponse>(
      `${this.apiUrl}/assessments/administrations`,
      { params: httpParams },
    );
  }

  getAdministrationById(id: string): Observable<AssessmentAdministration> {
    return this.http.get<AssessmentAdministration>(
      `${this.apiUrl}/assessments/administrations/${id}`,
    );
  }

  saveResponses(id: string, payload: SaveResponsesRequest): Observable<SaveResponsesResponse> {
    return this.http.patch<SaveResponsesResponse>(
      `${this.apiUrl}/assessments/administrations/${id}/responses`,
      payload,
    );
  }

  completeAssessment(id: string): Observable<CompleteAssessmentResponse> {
    return this.http.post<CompleteAssessmentResponse>(
      `${this.apiUrl}/assessments/administrations/${id}/complete`,
      {},
    );
  }

  getPsychometricReport(administrationId: string): Observable<PsychometricReportDto> {
    return this.http.get<PsychometricReportDto>(
      `${this.apiUrl}/assessments/administrations/${administrationId}/report`,
    );
  }

  getLongitudinalSeries(
    patientId: string,
    params?: QueryLongitudinalParams,
  ): Observable<LongitudinalAssessmentSeriesDto> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.instrumentCode) httpParams = httpParams.set('instrumentCode', params.instrumentCode);
      if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
      if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<LongitudinalAssessmentSeriesDto>(
      `${this.apiUrl}/assessments/patients/${patientId}/longitudinal`,
      { params: httpParams },
    );
  }

  // --- Public Remote Runner Operations (No auth header needed) ---

  getPublicAssessmentRunner(accessToken: string): Observable<AssessmentAdministration> {
    return this.http.get<AssessmentAdministration>(
      `${this.apiUrl}/assessments/public/runner/${accessToken}`,
    );
  }

  savePublicResponses(
    accessToken: string,
    payload: SaveResponsesRequest,
  ): Observable<SaveResponsesResponse> {
    return this.http.patch<SaveResponsesResponse>(
      `${this.apiUrl}/assessments/public/runner/${accessToken}/responses`,
      payload,
    );
  }

  completePublicAssessment(
    accessToken: string,
    payload?: SaveResponsesRequest,
  ): Observable<CompleteAssessmentResponse> {
    return this.http.post<CompleteAssessmentResponse>(
      `${this.apiUrl}/assessments/public/runner/${accessToken}/complete`,
      payload || {},
    );
  }
}
