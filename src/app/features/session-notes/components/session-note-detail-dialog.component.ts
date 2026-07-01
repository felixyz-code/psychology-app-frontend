import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SessionNote } from '../models/session-note.models';
import { SessionNoteWorkspaceComponent } from './session-note-workspace.component';

interface SessionNoteDetailDialogData {
  sessionNote: SessionNote;
}

type SessionNoteDetailDialogResult =
  | { action: 'close' }
  | { action: 'edit'; sessionNote: SessionNote }
  | { action: 'delete'; sessionNote: SessionNote };

@Component({
  selector: 'app-session-note-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule, SessionNoteWorkspaceComponent],
  templateUrl: './session-note-detail-dialog.component.html',
  styleUrl: './session-note-detail-dialog.component.scss',
})
export class SessionNoteDetailDialogComponent {
  private readonly data = inject<SessionNoteDetailDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<SessionNoteDetailDialogComponent, SessionNoteDetailDialogResult>
  );

  readonly sessionNote = this.data.sessionNote;

  getTitle(): string {
    return this.sessionNote.title?.trim() || 'Sesion sin titulo';
  }

  close(): void {
    this.dialogRef.close({ action: 'close' });
  }

  edit(): void {
    this.dialogRef.close({
      action: 'edit',
      sessionNote: this.sessionNote,
    });
  }

  delete(): void {
    this.dialogRef.close({
      action: 'delete',
      sessionNote: this.sessionNote,
    });
  }
}
