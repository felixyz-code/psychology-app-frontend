import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CaseFile,
  CaseFileWorkspaceResponse,
  CreateCaseFileRequest,
  UpdateCaseFileRequest,
} from '../models/case-file.models';
import { ClinicalPdfExportPayload } from '../models/clinical-pdf.models';

@Injectable({ providedIn: 'root' })
export class CaseFilesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getCaseFiles(): Observable<CaseFile[]> {
    return this.http.get<CaseFile[]>(`${this.apiUrl}/case-files`);
  }

  getCaseFileById(id: string): Observable<CaseFile> {
    return this.http.get<CaseFile>(`${this.apiUrl}/case-files/${id}`);
  }

  getWorkspace(caseFileId: string): Observable<CaseFileWorkspaceResponse> {
    return this.http.get<CaseFileWorkspaceResponse>(
      `${this.apiUrl}/case-files/${caseFileId}/workspace`,
    );
  }

  getCaseFileByPatientId(patientId: string): Observable<CaseFile> {
    return this.http.get<CaseFile>(`${this.apiUrl}/case-files/patient/${patientId}`);
  }

  createCaseFile(payload: CreateCaseFileRequest): Observable<CaseFile> {
    return this.http.post<CaseFile>(`${this.apiUrl}/case-files`, payload);
  }

  updateCaseFile(id: string, payload: UpdateCaseFileRequest): Observable<CaseFile> {
    return this.http.patch<CaseFile>(`${this.apiUrl}/case-files/${id}`, payload);
  }

  getClinicalPdfData(caseFileId: string, noteId?: string): Observable<ClinicalPdfExportPayload> {
    const url = noteId
      ? `${this.apiUrl}/case-files/${caseFileId}/notes/${noteId}/pdf-data`
      : `${this.apiUrl}/case-files/${caseFileId}/pdf-data`;
    return this.http.get<ClinicalPdfExportPayload>(url);
  }

  getConsentPdfData(caseFileId: string): Observable<ClinicalPdfExportPayload> {
    return this.http.get<ClinicalPdfExportPayload>(
      `${this.apiUrl}/case-files/${caseFileId}/consent-data`,
    );
  }
}
