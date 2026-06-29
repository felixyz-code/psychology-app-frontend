import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { DocumentDeleteDialogComponent } from '../components/document-delete-dialog.component';
import { DocumentMetadataEditDialogComponent } from '../components/document-metadata-edit-dialog.component';
import { DocumentPreviewDialogComponent } from '../components/document-preview-dialog.component';
import { DocumentUploadModalDialogComponent } from '../components/document-upload-modal-dialog.component';
import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { Document } from '../models/document.models';
import { DocumentsService } from '../services/documents.service';

@Component({
  selector: 'app-documents-list-placeholder-page',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    DataTableEmptyStateComponent,
    PageHeaderComponent,
    SectionCardComponent,
  ],
  templateUrl: './documents-list-placeholder.page.html',
  styleUrl: './documents-list-placeholder.page.scss',
})
export class DocumentsListPlaceholderPage {
  private readonly dialog = inject(MatDialog);
  private readonly documentsService = inject(DocumentsService);

  readonly displayedColumns = ['fileName', 'mimeType', 'caseFileId', 'uploadedById', 'uploadedAt', 'updatedAt', 'actions'];
  readonly documents = signal<Document[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly actionErrorMessage = signal('');

  constructor() {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.documentsService.getAll().subscribe({
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
    const dialogRef = this.dialog.open(DocumentUploadModalDialogComponent, {
      width: '820px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: false,
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
      width: '1100px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: false,
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

  getMimeTypeLabel(value?: string | null): string {
    return value?.trim() || '-';
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
