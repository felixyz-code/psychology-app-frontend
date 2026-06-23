import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreateSessionNoteRequest,
  SessionNote,
  UpdateSessionNoteRequest,
} from '../models/session-note.models';

@Injectable({ providedIn: 'root' })
export class SessionNotesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getSessionNotes(): Observable<SessionNote[]> {
    return this.http.get<SessionNote[]>(`${this.apiUrl}/session-notes`);
  }

  getSessionNotesByCaseFileId(caseFileId: string): Observable<SessionNote[]> {
    return this.http.get<SessionNote[]>(`${this.apiUrl}/session-notes/case-file/${caseFileId}`);
  }

  getSessionNoteById(id: string): Observable<SessionNote> {
    return this.http.get<SessionNote>(`${this.apiUrl}/session-notes/${id}`);
  }

  createSessionNote(payload: CreateSessionNoteRequest): Observable<SessionNote> {
    return this.http.post<SessionNote>(`${this.apiUrl}/session-notes`, payload);
  }

  updateSessionNote(id: string, payload: UpdateSessionNoteRequest): Observable<SessionNote> {
    return this.http.patch<SessionNote>(`${this.apiUrl}/session-notes/${id}`, payload);
  }

  deleteSessionNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/session-notes/${id}`);
  }
}
