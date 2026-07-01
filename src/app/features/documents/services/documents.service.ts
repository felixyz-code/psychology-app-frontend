import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Document, UpdateDocumentRequest } from '../models/document.models';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly basePath = `${this.apiUrl}/documents`;

  getAll(): Observable<Document[]> {
    return this.http.get<Document[]>(this.basePath);
  }

  getByCaseFile(caseFileId: string): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.basePath}/case-file/${caseFileId}`);
  }

  getById(id: string): Observable<Document> {
    return this.http.get<Document>(`${this.basePath}/${id}`);
  }

  update(id: string, payload: UpdateDocumentRequest): Observable<Document> {
    return this.http.patch<Document>(`${this.basePath}/${id}`, payload);
  }

  upload(caseFileId: string, file: File): Observable<Document> {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('caseFileId', caseFileId);

    return this.http.post<Document>(`${this.basePath}/upload`, formData);
  }

  view(id: string): Observable<Blob> {
    return this.http.get(`${this.basePath}/${id}/view`, {
      responseType: 'blob',
    });
  }

  download(id: string): Observable<Blob> {
    return this.http.get(`${this.basePath}/${id}/download`, {
      responseType: 'blob',
    });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/${id}`);
  }
}
