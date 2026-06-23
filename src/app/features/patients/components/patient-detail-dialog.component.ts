import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AppointmentDeleteDialogComponent } from '../../appointments/components/appointment-delete-dialog.component';
import { AppointmentFormDialogComponent } from '../../appointments/components/appointment-form-dialog.component';
import { Appointment, AppointmentStatus } from '../../appointments/models/appointment.models';
import { AppointmentsService } from '../../appointments/services/appointments.service';
import { CaseFileFormDialogComponent } from '../../case-files/components/case-file-form-dialog.component';
import { CaseFile } from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { DocumentDeleteDialogComponent } from '../../documents/components/document-delete-dialog.component';
import { DocumentUploadDialogComponent } from '../../documents/components/document-upload-dialog.component';
import { Document as ClinicalDocument } from '../../documents/models/document.models';
import { DocumentsService } from '../../documents/services/documents.service';
import { SessionNoteDeleteDialogComponent } from '../../session-notes/components/session-note-delete-dialog.component';
import { SessionNoteDetailDialogComponent } from '../../session-notes/components/session-note-detail-dialog.component';
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
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly documentsService = inject(DocumentsService);
  private readonly sessionNotesService = inject(SessionNotesService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(
    MatDialogRef<PatientDetailDialogComponent, { action: 'close' } | { action: 'edit'; patient: Patient }>
  );

  readonly patient = this.data.patient;
  readonly appointments = signal<Appointment[]>([]);
  readonly isAppointmentsLoading = signal(true);
  readonly appointmentsErrorMessage = signal('');
  readonly caseFile = signal<CaseFile | null>(null);
  readonly isCaseFileLoading = signal(true);
  readonly caseFileErrorMessage = signal('');
  readonly documents = signal<ClinicalDocument[]>([]);
  readonly isDocumentsLoading = signal(false);
  readonly documentsErrorMessage = signal('');
  readonly sessionNotes = signal<SessionNote[]>([]);
  readonly isSessionNotesLoading = signal(false);
  readonly sessionNotesErrorMessage = signal('');

  constructor() {
    this.loadAppointments();
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

  openCreateAppointmentDialog(): void {
    const dialogRef = this.dialog.open(AppointmentFormDialogComponent, {
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
        this.loadAppointments();
      }
    });
  }

  openEditAppointmentDialog(appointment: Appointment): void {
    const dialogRef = this.dialog.open(AppointmentFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'edit',
        patientId: this.patient.id,
        appointment,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadAppointments();
      }
    });
  }

  cancelAppointment(appointment: Appointment): void {
    this.appointmentsErrorMessage.set('');

    this.appointmentsService
      .updateAppointment(appointment.id, {
        status: 'CANCELLED',
      })
      .subscribe({
        next: () => {
          this.loadAppointments();
        },
        error: (error: HttpErrorResponse) => {
          this.appointmentsErrorMessage.set(this.getAppointmentActionErrorMessage(error, 'cancelar'));
        },
      });
  }

  openDeleteAppointmentDialog(appointment: Appointment): void {
    const dialogRef = this.dialog.open(AppointmentDeleteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        appointment,
      },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        this.loadAppointments();
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

  openUploadDocumentDialog(): void {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return;
    }

    const dialogRef = this.dialog.open(DocumentUploadDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        caseFileId: currentCaseFile.id,
      },
    });

    dialogRef.afterClosed().subscribe((uploaded) => {
      if (uploaded) {
        this.loadDocuments(currentCaseFile.id);
      }
    });
  }

  viewDocument(document: ClinicalDocument): void {
    this.documentsErrorMessage.set('');

    this.documentsService.view(document.id).subscribe({
      next: (blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const openedWindow = window.open(blobUrl, '_blank');

        if (!openedWindow) {
          URL.revokeObjectURL(blobUrl);
          this.documentsErrorMessage.set('No fue posible abrir el documento en una nueva pestana.');
          return;
        }

        openedWindow.opener = null;
      },
      error: (error: HttpErrorResponse) => {
        this.documentsErrorMessage.set(this.getDocumentActionErrorMessage(error, 'ver'));
      },
    });
  }

  downloadDocument(document: ClinicalDocument): void {
    this.documentsErrorMessage.set('');

    this.documentsService.download(document.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = globalThis.document.createElement('a');

        link.href = url;
        link.download = document.fileName;
        link.click();

        URL.revokeObjectURL(url);
      },
      error: (error: HttpErrorResponse) => {
        this.documentsErrorMessage.set(this.getDocumentActionErrorMessage(error, 'descargar'));
      },
    });
  }

  openDeleteDocumentDialog(document: ClinicalDocument): void {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return;
    }

    const dialogRef = this.dialog.open(DocumentDeleteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        document,
      },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        this.loadDocuments(currentCaseFile.id);
      }
    });
  }

  openEditSessionNoteDialog(sessionNote: SessionNote): void {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return;
    }

    const dialogRef = this.dialog.open(SessionNoteFormDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        mode: 'edit',
        caseFileId: currentCaseFile.id,
        sessionNote,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadSessionNotes(currentCaseFile.id);
      }
    });
  }

  openSessionNoteDetailDialog(sessionNote: SessionNote): void {
    const dialogRef = this.dialog.open(SessionNoteDetailDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        sessionNote,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'edit') {
        this.openEditSessionNoteDialog(result.sessionNote);
      }
    });
  }

  openDeleteSessionNoteDialog(sessionNote: SessionNote): void {
    const currentCaseFile = this.caseFile();

    if (!currentCaseFile) {
      return;
    }

    const dialogRef = this.dialog.open(SessionNoteDeleteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        sessionNote,
      },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
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

  getDocumentType(document: ClinicalDocument): string {
    if (document.mimeType === 'application/pdf') {
      return 'PDF';
    }

    if (document.mimeType === 'image/jpeg') {
      return 'Imagen JPEG';
    }

    if (document.mimeType === 'image/png') {
      return 'Imagen PNG';
    }

    return document.mimeType ?? 'Tipo no disponible';
  }

  getAppointmentStatusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      SCHEDULED: 'Programada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistio',
    };

    return labels[status];
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
    this.resetDocumentsState();
    this.resetSessionNotesState();

    this.caseFilesService.getCaseFileByPatientId(this.patient.id).subscribe({
      next: (caseFile) => {
        this.caseFile.set(caseFile);
        this.isCaseFileLoading.set(false);
        this.loadDocuments(caseFile.id);
        this.loadSessionNotes(caseFile.id);
      },
      error: (error: HttpErrorResponse) => {
        this.caseFile.set(null);
        this.isCaseFileLoading.set(false);
        this.resetDocumentsState();
        this.resetSessionNotesState();

        if (error.status === 404) {
          return;
        }

        this.caseFileErrorMessage.set('No fue posible cargar el expediente clinico.');
      },
    });
  }

  private loadAppointments(): void {
    this.isAppointmentsLoading.set(true);
    this.appointmentsErrorMessage.set('');
    this.appointments.set([]);

    this.appointmentsService.getAppointmentsByPatientId(this.patient.id).subscribe({
      next: (appointments) => {
        this.appointments.set(appointments);
        this.isAppointmentsLoading.set(false);
      },
      error: () => {
        this.appointments.set([]);
        this.isAppointmentsLoading.set(false);
        this.appointmentsErrorMessage.set('No fue posible cargar las citas.');
      },
    });
  }

  private loadDocuments(caseFileId: string): void {
    this.isDocumentsLoading.set(true);
    this.documentsErrorMessage.set('');
    this.documents.set([]);

    this.documentsService.getByCaseFile(caseFileId).subscribe({
      next: (documents) => {
        this.documents.set(documents);
        this.isDocumentsLoading.set(false);
      },
      error: () => {
        this.documents.set([]);
        this.isDocumentsLoading.set(false);
        this.documentsErrorMessage.set('No fue posible cargar los documentos.');
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

  private resetDocumentsState(): void {
    this.documents.set([]);
    this.isDocumentsLoading.set(false);
    this.documentsErrorMessage.set('');
  }

  private getDocumentActionErrorMessage(error: HttpErrorResponse, action: 'ver' | 'descargar'): string {
    if (error.status === 401 || error.status === 403) {
      return `No tienes permisos para ${action} este documento.`;
    }

    if (error.status === 404) {
      return 'El documento ya no esta disponible.';
    }

    return `No fue posible ${action} el documento.`;
  }

  private getAppointmentActionErrorMessage(error: HttpErrorResponse, action: 'cancelar'): string {
    if (error.status === 401 || error.status === 403) {
      return `No tienes permisos para ${action} esta cita.`;
    }

    if (error.status === 404) {
      return 'La cita ya no esta disponible.';
    }

    return `No fue posible ${action} la cita.`;
  }
}
