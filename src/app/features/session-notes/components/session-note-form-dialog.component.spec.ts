import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';

import { AuthStore } from '../../../core/auth/auth.store';
import { AuthUser } from '../../../core/auth/auth.models';
import { SessionNote } from '../models/session-note.models';
import { SessionNotesService } from '../services/session-notes.service';
import { SessionNoteFormDialogComponent } from './session-note-form-dialog.component';

describe('SessionNoteFormDialogComponent', () => {
  let currentUser: AuthUser | null;
  let sessionNotesService: {
    createSessionNote: ReturnType<typeof vi.fn>;
    updateSessionNote: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    currentUser = createUser();
    sessionNotesService = {
      createSessionNote: vi.fn(),
      updateSessionNote: vi.fn(),
    };
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('creates a note with the authenticated author and closes only after success', () => {
    sessionNotesService.createSessionNote.mockReturnValue(of(createSessionNote()));
    const { component, dialogRef } = createComponent({ mode: 'create', caseFileId: 'case-file-1' });
    component.sessionNoteForm.setValue({
      title: ' Seguimiento ',
      content: ' La paciente reporta mejoria. ',
      sessionDate: '2026-07-02T09:30',
    });

    component.submit();

    expect(sessionNotesService.createSessionNote).toHaveBeenCalledTimes(1);
    expect(sessionNotesService.createSessionNote).toHaveBeenCalledWith({
      caseFileId: 'case-file-1',
      authorId: 'psychologist-1',
      title: 'Seguimiento',
      content: 'La paciente reporta mejoria.',
      sessionDate: new Date('2026-07-02T09:30').toISOString(),
    });
    expect(component.isSaving()).toBe(false);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('keeps the current create payload anonymous when no authenticated user exists', () => {
    currentUser = null;
    sessionNotesService.createSessionNote.mockReturnValue(of(createSessionNote()));
    const { component } = createComponent({ mode: 'create', caseFileId: 'case-file-1' });
    component.sessionNoteForm.setValue({
      title: '',
      content: 'Contenido clinico',
      sessionDate: '2026-07-02T09:30',
    });

    component.submit();

    expect(sessionNotesService.createSessionNote).toHaveBeenCalledWith({
      caseFileId: 'case-file-1',
      title: null,
      content: 'Contenido clinico',
      sessionDate: new Date('2026-07-02T09:30').toISOString(),
    });
  });

  it('updates the supplied note without calling create and closes after success', () => {
    const sessionNote = createSessionNote();
    sessionNotesService.updateSessionNote.mockReturnValue(of({ ...sessionNote, content: 'Contenido actualizado.' }));
    const { component, dialogRef } = createComponent({
      mode: 'edit',
      caseFileId: 'case-file-1',
      sessionNote,
    });
    component.sessionNoteForm.setValue({
      title: ' Plan actualizado ',
      content: ' Contenido actualizado. ',
      sessionDate: '2026-07-03T10:00',
    });

    component.submit();

    expect(sessionNotesService.updateSessionNote).toHaveBeenCalledWith('note-1', {
      title: 'Plan actualizado',
      content: 'Contenido actualizado.',
      sessionDate: new Date('2026-07-03T10:00').toISOString(),
    });
    expect(sessionNotesService.createSessionNote).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it.each([
    ['create', { mode: 'create' as const, caseFileId: 'case-file-1' }],
    ['update', { mode: 'edit' as const, caseFileId: 'case-file-1', sessionNote: createSessionNote() }],
  ])('keeps the dialog open and exposes an error when %s fails', (_operation, data) => {
    const failedRequest = throwError(() => new Error('Unavailable'));
    sessionNotesService.createSessionNote.mockReturnValue(failedRequest);
    sessionNotesService.updateSessionNote.mockReturnValue(failedRequest);
    const { component, dialogRef } = createComponent(data);
    component.sessionNoteForm.setValue({
      title: 'Seguimiento',
      content: 'Contenido clinico',
      sessionDate: '2026-07-02T09:30',
    });

    component.submit();

    expect(component.isSaving()).toBe(false);
    expect(component.errorMessage()).not.toBe('');
    expect(component.sessionNoteForm.getRawValue().content).toBe('Contenido clinico');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('does not start a second create request while the first one is pending', () => {
    const pendingRequest = new Subject<SessionNote>();
    sessionNotesService.createSessionNote.mockReturnValue(pendingRequest);
    const { component, dialogRef } = createComponent({ mode: 'create', caseFileId: 'case-file-1' });
    component.sessionNoteForm.controls.content.setValue('Contenido clinico');

    component.submit();
    component.submit();

    expect(sessionNotesService.createSessionNote).toHaveBeenCalledTimes(1);
    expect(component.isSaving()).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();

    pendingRequest.next(createSessionNote());
    pendingRequest.complete();

    expect(component.isSaving()).toBe(false);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('does not submit or close when the form is invalid', () => {
    const { component, dialogRef } = createComponent({ mode: 'create', caseFileId: 'case-file-1' });

    component.submit();

    expect(component.sessionNoteForm.controls.content.touched).toBe(true);
    expect(sessionNotesService.createSessionNote).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  function createComponent(data: {
    mode: 'create' | 'edit';
    caseFileId: string;
    sessionNote?: SessionNote;
  }): {
    component: SessionNoteFormDialogComponent;
    fixture: ComponentFixture<SessionNoteFormDialogComponent>;
    dialogRef: { close: ReturnType<typeof vi.fn> };
  } {
    const dialogRef = { close: vi.fn() };

    TestBed.configureTestingModule({
      imports: [SessionNoteFormDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: AuthStore, useValue: { user: () => currentUser } },
        { provide: SessionNotesService, useValue: sessionNotesService },
      ],
    });

    const fixture = TestBed.createComponent(SessionNoteFormDialogComponent);
    return { component: fixture.componentInstance, fixture, dialogRef };
  }
});

function createUser(): AuthUser {
  return {
    id: 'psychologist-1',
    name: 'Dra. Rivera',
    email: 'rivera@example.com',
    role: 'PSYCHOLOGIST',
  };
}

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
