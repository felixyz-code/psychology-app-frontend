import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, forkJoin, of } from 'rxjs';

import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { CaseFile } from '../../case-files/models/case-file.models';
import { CaseFilesService } from '../../case-files/services/case-files.service';
import { DocumentDeleteDialogComponent } from './document-delete-dialog.component';
import { DocumentMetadataEditDialogComponent } from './document-metadata-edit-dialog.component';
import { DocumentPreviewDialogComponent } from './document-preview-dialog.component';
import { DocumentUploadModalDialogComponent } from './document-upload-modal-dialog.component';
import { Document } from '../models/document.models';
import { Patient } from '../../patients/models/patient.models';
import { PatientsService } from '../../patients/services/patients.service';
import { DocumentsService } from '../services/documents.service';

type DocumentsListScope = 'global' | 'case-file';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    DataTableEmptyStateComponent,
    SectionCardComponent,
  ],
  templateUrl: './documents-list.component.html',
  styleUrl: './documents-list.component.scss',
})
export class DocumentsListComponent {
  private static readonly GLOBAL_COLUMNS = ['fileName', 'patient', 'type', 'uploadedAt', 'actions'];
  private static readonly CASE_FILE_COLUMNS = ['fileName', 'type', 'uploadedAt', 'actions'];

  private readonly dialog = inject(MatDialog);
  private readonly caseFilesService = inject(CaseFilesService);
  private readonly documentsService = inject(DocumentsService);
  private readonly patientsService = inject(PatientsService);

  readonly scope = input<DocumentsListScope>('global');
  readonly caseFileId = input<string | null>(null);
  readonly cardTitle = input('Documentos');
  readonly cardSubtitle = input('Consulta la metadata disponible y accede a la visualizacion, descarga o eliminacion del registro segun el contrato actual.');
  readonly emptyTitle = input('No hay documentos registrados');
  readonly emptyMessage = input('Cuando existan documentos disponibles, apareceran en este listado.');
  readonly uploadButtonLabel = input('Nuevo documento');
  readonly showUploadAction = input(true);
  readonly items = input<Document[] | null>(null);
  readonly externalLoading = input(false);
  readonly externalErrorMessage = input('');
  readonly displayedColumns = computed(() =>
    this.scope() === 'global'
      ? DocumentsListComponent.GLOBAL_COLUMNS
      : DocumentsListComponent.CASE_FILE_COLUMNS
  );
  readonly documents = signal<Document[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly actionErrorMessage = signal('');
  readonly patients = signal<Patient[]>([]);
  readonly caseFiles = signal<CaseFile[]>([]);
  readonly documentsLoaded = output<Document[]>();
  readonly documentsChanged = output<void>();
  readonly patientMap = computed(() => {
    const map = new Map<string, Patient>();

    for (const patient of this.patients()) {
      map.set(patient.id, patient);
    }

    return map;
  });
  readonly caseFileMap = computed(() => {
    const map = new Map<string, CaseFile>();

    for (const caseFile of this.caseFiles()) {
      map.set(caseFile.id, caseFile);
    }

    return map;
  });

  constructor() {
    effect(() => {
      const providedItems = this.items();

      if (providedItems !== null) {
        this.documents.set(providedItems);
        this.patients.set([]);
        this.caseFiles.set([]);
        this.errorMessage.set(this.externalErrorMessage());
        this.isLoading.set(this.externalLoading());
        this.documentsLoaded.emit(providedItems);
        return;
      }

      const scope = this.scope();
      const caseFileId = this.caseFileId();

      if (scope === 'case-file' && !caseFileId) {
        this.documents.set([]);
        this.isLoading.set(false);
        this.errorMessage.set('');
        return;
      }

      this.loadDocuments();
    });
  }

  loadDocuments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const caseFileId = this.caseFileId();
    const isCaseFileScope = this.scope() === 'case-file' && caseFileId;

    if (isCaseFileScope) {
      this.documentsService.getByCaseFile(caseFileId).subscribe({
        next: (documents) => {
          this.documents.set(documents);
          this.patients.set([]);
          this.caseFiles.set([]);
          this.documentsLoaded.emit(documents);
          this.isLoading.set(false);
        },
        error: () => {
          this.documents.set([]);
          this.patients.set([]);
          this.caseFiles.set([]);
          this.documentsLoaded.emit([]);
          this.errorMessage.set('No fue posible cargar los documentos.');
          this.isLoading.set(false);
        },
      });

      return;
    }

    forkJoin({
      documents: this.documentsService.getAll(),
      caseFiles: this.caseFilesService.getCaseFiles().pipe(catchError(() => of([] as CaseFile[]))),
      patients: this.patientsService.getPatients().pipe(catchError(() => of([] as Patient[]))),
    }).subscribe({
      next: ({ documents, caseFiles, patients }) => {
        this.documents.set(documents);
        this.caseFiles.set(caseFiles);
        this.patients.set(patients);
        this.documentsLoaded.emit(documents);
        this.isLoading.set(false);
      },
      error: () => {
        this.documents.set([]);
        this.patients.set([]);
        this.caseFiles.set([]);
        this.documentsLoaded.emit([]);
        this.errorMessage.set('No fue posible cargar los documentos.');
        this.isLoading.set(false);
      },
    });
  }

  openUploadDialog(): void {
    const caseFileId = this.caseFileId();
    const dialogRef = this.dialog.open(DocumentUploadModalDialogComponent, {
      width: '820px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: false,
      data: caseFileId ? { caseFileId } : null,
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        if (this.items() !== null) {
          this.documentsChanged.emit();
          return;
        }

        this.loadDocuments();
      }
    });
  }

  viewDocument(document: Document): void {
    this.actionErrorMessage.set('');

    this.dialog.open(DocumentPreviewDialogComponent, {
      autoFocus: false,
      disableClose: false,
      panelClass: 'app-document-preview-panel',
      data: {
        document,
      },
    });
  }

  downloadDocument(document: Document): void {
    this.actionErrorMessage.set('');

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
        this.actionErrorMessage.set(this.getDocumentActionErrorMessage(error, 'descargar'));
      },
    });
  }

  openDeleteDialog(document: Document): void {
    this.actionErrorMessage.set('');

    const dialogRef = this.dialog.open(DocumentDeleteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: this.isLoading(),
      data: {
        document,
      },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        if (this.items() !== null) {
          this.documentsChanged.emit();
          return;
        }

        this.loadDocuments();
      }
    });
  }

  openEditDialog(document: Document): void {
    this.actionErrorMessage.set('');

    const dialogRef = this.dialog.open(DocumentMetadataEditDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: false,
      data: {
        documentId: document.id,
      },
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        if (this.items() !== null) {
          this.documentsChanged.emit();
          return;
        }

        this.loadDocuments();
      }
    });
  }

  stopRowClick(event: Event): void {
    event.stopPropagation();
  }

  getDocumentTypeLabel(document: Document): string {
    const mimeType = document.mimeType?.trim().toLowerCase() ?? '';

    if (mimeType === 'application/pdf') {
      return 'PDF';
    }

    if (mimeType === 'image/png') {
      return 'Imagen PNG';
    }

    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return 'Imagen JPG';
    }

    return document.mimeType?.trim() || 'No disponible';
  }

  getDocumentIcon(document: Document): string {
    const mimeType = document.mimeType?.trim().toLowerCase() ?? '';

    if (mimeType === 'application/pdf') {
      return 'picture_as_pdf';
    }

    if (mimeType === 'image/png' || mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return 'image';
    }

    return 'description';
  }

  getPatientName(document: Document): string {
    const embeddedPatient = document.patient ?? document.caseFile?.patient ?? null;

    if (embeddedPatient) {
      return this.formatPatientName(embeddedPatient);
    }

    const patientId = document.patientId?.trim() || this.caseFileMap().get(document.caseFileId)?.patientId?.trim();

    if (!patientId) {
      return 'No asignado';
    }

    const patient = this.patientMap().get(patientId);

    return patient ? this.formatPatientName(patient) : 'Sin paciente';
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

  private formatPatientName(patient: Patient): string {
    const fullName = `${patient.firstName} ${patient.lastName}`.trim();

    return fullName || 'Sin paciente';
  }
}
