import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { DocumentDeleteDialogComponent } from './document-delete-dialog.component';
import { DocumentMetadataEditDialogComponent } from './document-metadata-edit-dialog.component';
import { DocumentPreviewDialogComponent } from './document-preview-dialog.component';
import { DocumentUploadModalDialogComponent } from './document-upload-modal-dialog.component';
import { Document } from '../models/document.models';
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
  private readonly dialog = inject(MatDialog);
  private readonly documentsService = inject(DocumentsService);

  readonly scope = input<DocumentsListScope>('global');
  readonly caseFileId = input<string | null>(null);
  readonly cardTitle = input('Documentos');
  readonly cardSubtitle = input('Consulta la metadata disponible y accede a la visualizacion, descarga o eliminacion del registro segun el contrato actual.');
  readonly emptyTitle = input('No hay documentos registrados');
  readonly emptyMessage = input('Cuando existan documentos disponibles, apareceran en este listado.');
  readonly uploadButtonLabel = input('Nuevo documento');
  readonly displayedColumns = ['fileName', 'type', 'uploadedAt', 'actions'];
  readonly documents = signal<Document[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly actionErrorMessage = signal('');

  constructor() {
    effect(() => {
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
    const request$ =
      this.scope() === 'case-file' && caseFileId
        ? this.documentsService.getByCaseFile(caseFileId)
        : this.documentsService.getAll();

    request$.subscribe({
      next: (documents) => {
        this.documents.set(documents);
        this.isLoading.set(false);
      },
      error: () => {
        this.documents.set([]);
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

  private getDocumentActionErrorMessage(error: HttpErrorResponse, action: 'ver' | 'descargar'): string {
    if (error.status === 401 || error.status === 403) {
      return `No tienes permisos para ${action} este documento.`;
    }

    if (error.status === 404) {
      return 'El documento ya no esta disponible.';
    }

    return `No fue posible ${action} el documento.`;
  }
}
