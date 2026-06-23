import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CaseFileFormDialogComponent } from '../../case-files/components/case-file-form-dialog.component';
import { CaseFile } from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { SessionNoteFormDialogComponent } from '../../session-notes/components/session-note-form-dialog.component';
import { SessionNote } from '../../session-notes/models/session-note.models';
import { SessionNotesService } from '../../session-notes/services/session-notes.service';
import { Patient } from '../models/patient.models';

interface PatientDetailDialogData {
  patient: Patient;
}

@Component({
  selector: 'app-patient-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './patient-detail-dialog.component.html',
  styleUrl: './patient-detail-dialog.component.scss',
})
export class PatientDetailDialogComponent {
  private readonly data = inject<PatientDetailDialogData>(MAT_DIALOG_DATA);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly sessionNotesService = inject(SessionNotesService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(
    MatDialogRef<PatientDetailDialogComponent, { action: 'close' } | { action: 'edit'; patient: Patient }>
  );

  readonly patient = this.data.patient;
  readonly caseFile = signal<CaseFile | null>(null);
  readonly isCaseFileLoading = signal(true);
  readonly caseFileErrorMessage = signal('');
  readonly sessionNotes = signal<SessionNote[]>([]);
  readonly isSessionNotesLoading = signal(false);
  readonly sessionNotesErrorMessage = signal('');

  constructor() {
    this.loadCaseFile();
  }

  close(): void {
    this.dialogRef.close({ action: 'close' });
  }

  edit(): void {
    this.dialogRef.close({
      action: 'edit',
      patient: this.patient,
    });
  }

  openCreateCaseFileDialog(): void {
    const dialogRef = this.dialog.open(CaseFileFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'create',
        patientId: this.patient.id,
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.loadCaseFile();
      }
    });
  }

  openEditCaseFileDialog(): void {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return;
    }

    const dialogRef = this.dialog.open(CaseFileFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'edit',
        patientId: this.patient.id,
        caseFile: currentCaseFile,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadCaseFile();
      }
    });
  }

  openCreateSessionNoteDialog(): void {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return;
    }

    const dialogRef = this.dialog.open(SessionNoteFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'create',
        caseFileId: currentCaseFile.id,
      },
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.loadSessionNotes(currentCaseFile.id);
      }
    });
  }

  getFullName(): string {
    return `${this.patient.firstName} ${this.patient.lastName}`;
  }

  getDisplayValue(value?: string | null): string {
    return value?.trim() || '-';
  }

  formatBirthDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const dateOnly = value.slice(0, 10);
    const [year, month, day] = dateOnly.split('-');

    if (!year || !month || !day) {
      return '-';
    }

    return `${day}/${month}/${year}`;
  }

  private loadCaseFile(): void {
    this.isCaseFileLoading.set(true);
    this.caseFileErrorMessage.set('');
    this.resetSessionNotesState();

    this.caseFilesService.getCaseFileByPatientId(this.patient.id).subscribe({
      next: (caseFile) => {
        this.caseFile.set(caseFile);
        this.isCaseFileLoading.set(false);
        this.loadSessionNotes(caseFile.id);
      },
      error: (error: HttpErrorResponse) => {
        this.caseFile.set(null);
        this.isCaseFileLoading.set(false);
        this.resetSessionNotesState();

        if (error.status === 404) {
          return;
        }

        this.caseFileErrorMessage.set('No fue posible cargar el expediente clinico.');
      },
    });
  }

  private loadSessionNotes(caseFileId: string): void {
    this.isSessionNotesLoading.set(true);
    this.sessionNotesErrorMessage.set('');
    this.sessionNotes.set([]);

    this.sessionNotesService.getSessionNotesByCaseFileId(caseFileId).subscribe({
      next: (sessionNotes) => {
        this.sessionNotes.set(sessionNotes);
        this.isSessionNotesLoading.set(false);
      },
      error: () => {
        this.sessionNotes.set([]);
        this.isSessionNotesLoading.set(false);
        this.sessionNotesErrorMessage.set('No fue posible cargar las notas de sesion.');
      },
    });
  }

  private resetSessionNotesState(): void {
    this.sessionNotes.set([]);
    this.isSessionNotesLoading.set(false);
    this.sessionNotesErrorMessage.set('');
  }
}
