import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CaseFileAttachment,
  UploadCaseFileAttachmentRequest,
} from '../models/case-file-attachment.models';

@Injectable({ providedIn: 'root' })
export class CaseFileAttachmentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAttachments(caseFileId: string): Observable<CaseFileAttachment[]> {
    return this.http.get<CaseFileAttachment[]>(
      `${this.apiUrl}/case-files/${caseFileId}/attachments`,
    );
  }

  upload(request: UploadCaseFileAttachmentRequest): Observable<CaseFileAttachment> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.category) {
      formData.append('category', request.category);
    }
    if (request.notes) {
      formData.append('notes', request.notes);
    }

    return this.http.post<CaseFileAttachment>(
      `${this.apiUrl}/case-files/${request.caseFileId}/attachments`,
      formData,
    );
  }

  download(caseFileId: string, attachmentId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/case-files/${caseFileId}/attachments/${attachmentId}/download`,
      { responseType: 'blob' },
    );
  }

  view(caseFileId: string, attachmentId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/case-files/${caseFileId}/attachments/${attachmentId}/view`,
      { responseType: 'blob' },
    );
  }

  delete(caseFileId: string, attachmentId: string): Observable<CaseFileAttachment> {
    return this.http.delete<CaseFileAttachment>(
      `${this.apiUrl}/case-files/${caseFileId}/attachments/${attachmentId}`,
    );
  }
}
