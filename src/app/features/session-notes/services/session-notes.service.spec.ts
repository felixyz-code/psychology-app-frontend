import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CreateSessionNoteRequest, SessionNote, UpdateSessionNoteRequest } from '../models/session-note.models';
import { SessionNotesService } from './session-notes.service';

describe('SessionNotesService', () => {
  let service: SessionNotesService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SessionNotesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('gets the global session notes list from the session-notes endpoint', () => {
    let result: SessionNote[] | undefined;

    service.getSessionNotes().subscribe((notes) => (result = notes));

    const request = httpTesting.expectOne('/api/session-notes');
    expect(request.request.method).toBe('GET');
    request.flush([createSessionNote()]);

    expect(result).toEqual([createSessionNote()]);
  });

  it('propagates global list HTTP errors without transforming them', () => {
    let receivedError: unknown;

    service.getSessionNotes().subscribe({ error: (error) => (receivedError = error) });

    httpTesting.expectOne('/api/session-notes').flush('Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });

    expect(receivedError).toMatchObject({ status: 503, statusText: 'Service Unavailable' });
  });

  it('gets session notes for a case file from the case-file endpoint', () => {
    service.getSessionNotesByCaseFileId('case-file-1').subscribe();

    const request = httpTesting.expectOne('/api/session-notes/case-file/case-file-1');
    expect(request.request.method).toBe('GET');
    request.flush([createSessionNote()]);
  });

  it('propagates case-file list HTTP errors without transforming them', () => {
    let receivedError: unknown;

    service.getSessionNotesByCaseFileId('case-file-1').subscribe({ error: (error) => (receivedError = error) });

    httpTesting.expectOne('/api/session-notes/case-file/case-file-1').flush('Unavailable', {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(receivedError).toMatchObject({ status: 500, statusText: 'Internal Server Error' });
  });

  it('gets a session note detail from the note endpoint', () => {
    let result: SessionNote | undefined;

    service.getSessionNoteById('note-1').subscribe((note) => (result = note));

    const request = httpTesting.expectOne('/api/session-notes/note-1');
    expect(request.request.method).toBe('GET');
    request.flush(createSessionNote());

    expect(result).toEqual(createSessionNote());
  });

  it('posts the complete create payload to the session-notes endpoint', () => {
    const payload: CreateSessionNoteRequest = {
      caseFileId: 'case-file-1',
      authorId: 'psychologist-1',
      title: 'Seguimiento',
      content: 'La paciente reporta mejoria.',
      sessionDate: '2026-07-02T09:00:00.000Z',
    };

    service.createSessionNote(payload).subscribe();

    const request = httpTesting.expectOne('/api/session-notes');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(createSessionNote());
  });

  it('propagates create HTTP errors without transforming them', () => {
    let receivedError: unknown;

    service.createSessionNote(createCreatePayload()).subscribe({ error: (error) => (receivedError = error) });

    httpTesting.expectOne('/api/session-notes').flush('Invalid payload', {
      status: 400,
      statusText: 'Bad Request',
    });

    expect(receivedError).toMatchObject({ status: 400, statusText: 'Bad Request' });
  });

  it('patches a session note with the update payload only', () => {
    const payload: UpdateSessionNoteRequest = {
      title: null,
      content: 'Contenido actualizado.',
      sessionDate: '2026-07-03T10:00:00.000Z',
    };

    service.updateSessionNote('note-1', payload).subscribe();

    const request = httpTesting.expectOne('/api/session-notes/note-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush({ ...createSessionNote(), ...payload });
  });

  it('propagates update HTTP errors without transforming them', () => {
    let receivedError: unknown;

    service.updateSessionNote('note-1', { content: 'Contenido actualizado.' }).subscribe({
      error: (error) => (receivedError = error),
    });

    httpTesting.expectOne('/api/session-notes/note-1').flush('Conflict', {
      status: 409,
      statusText: 'Conflict',
    });

    expect(receivedError).toMatchObject({ status: 409, statusText: 'Conflict' });
  });

  it('deletes a session note from the note endpoint', () => {
    service.deleteSessionNote('note-1').subscribe();

    const request = httpTesting.expectOne('/api/session-notes/note-1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('propagates delete HTTP errors without transforming them', () => {
    let receivedError: unknown;

    service.deleteSessionNote('note-1').subscribe({ error: (error) => (receivedError = error) });

    httpTesting.expectOne('/api/session-notes/note-1').flush('Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });

    expect(receivedError).toMatchObject({ status: 503, statusText: 'Service Unavailable' });
  });
});

function createSessionNote(): SessionNote {
  return {
    id: 'note-1',
    caseFileId: 'case-file-1',
    authorId: 'psychologist-1',
    title: 'Seguimiento',
    content: 'La paciente reporta mejoria.',
    sessionDate: '2026-07-02T09:00:00.000Z',
    createdAt: '2026-07-02T10:00:00.000Z',
    updatedAt: '2026-07-02T10:00:00.000Z',
  };
}

function createCreatePayload(): CreateSessionNoteRequest {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = createSessionNote();
  return payload;
}
