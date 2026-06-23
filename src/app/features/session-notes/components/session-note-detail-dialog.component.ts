import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { SessionNote } from '../models/session-note.models';

interface SessionNoteDetailDialogData {
  sessionNote: SessionNote;
}

type SessionNoteDetailDialogResult =
  | { action: 'close' }
  | { action: 'edit'; sessionNote: SessionNote };

@Component({
  selector: 'app-session-note-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule],
  templateUrl: './session-note-detail-dialog.component.html',
  styleUrl: './session-note-detail-dialog.component.scss',
})
export class SessionNoteDetailDialogComponent {
  private readonly data = inject<SessionNoteDetailDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<SessionNoteDetailDialogComponent, SessionNoteDetailDialogResult>
  );

  readonly sessionNote = this.data.sessionNote;

  close(): void {
    this.dialogRef.close({ action: 'close' });
  }

  edit(): void {
    this.dialogRef.close({
      action: 'edit',
      sessionNote: this.sessionNote,
    });
  }
}
