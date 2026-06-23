import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SessionNote } from '../models/session-note.models';
import { SessionNotesService } from '../services/session-notes.service';

interface SessionNoteDeleteDialogData {
  sessionNote: SessionNote;
}

@Component({
  selector: 'app-session-note-delete-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './session-note-delete-dialog.component.html',
  styleUrl: './session-note-delete-dialog.component.scss',
})
export class SessionNoteDeleteDialogComponent {
  private readonly data = inject<SessionNoteDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly sessionNotesService = inject(SessionNotesService);
  private readonly dialogRef = inject(MatDialogRef<SessionNoteDeleteDialogComponent, boolean>);

  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');
  readonly sessionNote = this.data.sessionNote;

  confirmDelete(): void {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.errorMessage.set('');

    this.sessionNotesService
      .deleteSessionNote(this.sessionNote.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: () => {
          this.errorMessage.set('No fue posible eliminar la nota de sesión.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
