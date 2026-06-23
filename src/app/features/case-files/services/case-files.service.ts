import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CaseFile,
  CreateCaseFileRequest,
  UpdateCaseFileRequest,
} from '../models/case-file.models';

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

  getCaseFileByPatientId(patientId: string): Observable<CaseFile> {
    return this.http.get<CaseFile>(`${this.apiUrl}/case-files/patient/${patientId}`);
  }

  createCaseFile(payload: CreateCaseFileRequest): Observable<CaseFile> {
    return this.http.post<CaseFile>(`${this.apiUrl}/case-files`, payload);
  }

  updateCaseFile(id: string, payload: UpdateCaseFileRequest): Observable<CaseFile> {
    return this.http.patch<CaseFile>(`${this.apiUrl}/case-files/${id}`, payload);
  }
}
