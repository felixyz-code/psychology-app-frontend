import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';

import { SessionNote } from '../models/session-note.models';
import { SessionNotesService } from '../services/session-notes.service';
import { SessionNoteDeleteDialogComponent } from './session-note-delete-dialog.component';

describe('SessionNoteDeleteDialogComponent', () => {
  let sessionNotesService: { deleteSessionNote: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sessionNotesService = { deleteSessionNote: vi.fn() };
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('deletes once, prevents a duplicate confirmation, and closes only after success', () => {
    const pendingRequest = new Subject<void>();
    sessionNotesService.deleteSessionNote.mockReturnValue(pendingRequest);
    const { component, dialogRef } = createComponent();

    component.confirmDelete();
    component.confirmDelete();

    expect(sessionNotesService.deleteSessionNote).toHaveBeenCalledTimes(1);
    expect(sessionNotesService.deleteSessionNote).toHaveBeenCalledWith('note-1');
    expect(component.isDeleting()).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();

    pendingRequest.next();
    pendingRequest.complete();

    expect(component.isDeleting()).toBe(false);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('keeps the dialog open, exposes an error, and allows a retry when deletion fails', () => {
    sessionNotesService.deleteSessionNote
      .mockReturnValueOnce(throwError(() => new Error('Unavailable')))
      .mockReturnValueOnce(of(void 0));
    const { component, dialogRef } = createComponent();

    component.confirmDelete();

    expect(component.isDeleting()).toBe(false);
    expect(component.errorMessage()).not.toBe('');
    expect(dialogRef.close).not.toHaveBeenCalled();

    component.confirmDelete();

    expect(sessionNotesService.deleteSessionNote).toHaveBeenCalledTimes(2);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  function createComponent(): {
    component: SessionNoteDeleteDialogComponent;
    dialogRef: { close: ReturnType<typeof vi.fn> };
  } {
    const dialogRef = { close: vi.fn() };

    TestBed.configureTestingModule({
      imports: [SessionNoteDeleteDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { sessionNote: createSessionNote() } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: SessionNotesService, useValue: sessionNotesService },
      ],
    });

    const fixture = TestBed.createComponent(SessionNoteDeleteDialogComponent);
    return { component: fixture.componentInstance, dialogRef };
  }
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
