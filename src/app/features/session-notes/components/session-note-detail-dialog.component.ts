import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ClinicalDocumentPreviewDialogComponent } from '../../case-files/components/clinical-document-preview-dialog.component';
import { ClinicalDocumentType } from '../../case-files/models/clinical-pdf.models';
import { SessionNote } from '../models/session-note.models';
import { SessionNotesService } from '../services/session-notes.service';
import { SessionNoteWorkspaceComponent } from './session-note-workspace.component';

interface SessionNoteDetailDialogData {
  sessionNote: SessionNote;
}

type SessionNoteDetailDialogResult =
  | { action: 'close' }
  | { action: 'edit'; sessionNote: SessionNote }
  | { action: 'delete'; sessionNote: SessionNote }
  | { action: 'schedule_next'; sessionNote: SessionNote };

@Component({
  selector: 'app-session-note-detail-dialog',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SessionNoteWorkspaceComponent,
  ],
  templateUrl: './session-note-detail-dialog.component.html',
  styleUrl: './session-note-detail-dialog.component.scss',
})
export class SessionNoteDetailDialogComponent {
  private readonly data = inject<SessionNoteDetailDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<SessionNoteDetailDialogComponent, SessionNoteDetailDialogResult>,
  );
  private readonly sessionNotesService = inject(SessionNotesService);
  private readonly dialog = inject(MatDialog);

  readonly sessionNote = this.data.sessionNote;
  readonly isGeneratingPdf = signal(false);

  getTitle(): string {
    return this.sessionNote.title?.trim() || 'Sesion sin titulo';
  }

  openPdfPreview(type: ClinicalDocumentType = 'NOM_004_EVOLUTION_NOTE'): void {
    this.isGeneratingPdf.set(true);
    this.sessionNotesService.getPdfData(this.sessionNote.id).subscribe({
      next: (payload) => {
        this.isGeneratingPdf.set(false);
        this.dialog.open(ClinicalDocumentPreviewDialogComponent, {
          data: {
            payload,
            initialDocumentType: type,
            caseFileId: this.sessionNote.caseFileId,
            noteId: this.sessionNote.id,
          },
          width: '90vw',
          maxWidth: '960px',
          maxHeight: '94vh',
          panelClass: 'app-clinical-preview-dialog-panel',
          autoFocus: false,
          restoreFocus: true,
        });
      },
      error: () => {
        this.isGeneratingPdf.set(false);
      },
    });
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

  scheduleNext(): void {
    this.dialogRef.close({
      action: 'schedule_next',
      sessionNote: this.sessionNote,
    });
  }
}
