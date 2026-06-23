import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Document } from '../models/document.models';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAll(): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/documents`);
  }

  getByCaseFile(caseFileId: string): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/documents/case-file/${caseFileId}`);
  }

  getById(id: string): Observable<Document> {
    return this.http.get<Document>(`${this.apiUrl}/documents/${id}`);
  }

  upload(caseFileId: string, uploadedById: string, file: File): Observable<Document> {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('caseFileId', caseFileId);
    formData.append('uploadedById', uploadedById);

    return this.http.post<Document>(`${this.apiUrl}/documents/upload`, formData);
  }

  view(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${id}/view`, {
      responseType: 'blob',
    });
  }

  download(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${id}/download`, {
      responseType: 'blob',
    });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/documents/${id}`);
  }
}
