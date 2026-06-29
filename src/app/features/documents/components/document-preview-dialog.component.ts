import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Document } from '../models/document.models';
import { DocumentsService } from '../services/documents.service';

interface DocumentPreviewDialogData {
  document: Document;
}

type PreviewKind = 'pdf' | 'image' | 'unsupported' | 'unavailable';

@Component({
  selector: 'app-document-preview-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './document-preview-dialog.component.html',
  styleUrl: './document-preview-dialog.component.scss',
})
export class DocumentPreviewDialogComponent implements OnDestroy {
  private readonly data = inject<DocumentPreviewDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DocumentPreviewDialogComponent>);
  private readonly documentsService = inject(DocumentsService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly document = this.data.document;
  readonly isLoading = signal(true);
  readonly isDownloading = signal(false);
  readonly errorMessage = signal('');
  readonly previewKind = signal<PreviewKind>('unavailable');
  readonly previewUrl = signal<string | null>(null);
  readonly previewResourceUrl = signal<SafeResourceUrl | null>(null);

  constructor() {
    this.loadPreview();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }

  close(): void {
    this.dialogRef.close();
  }

  getPreviewIcon(): string {
    const previewKind = this.previewKind();

    if (previewKind === 'pdf') {
      return 'picture_as_pdf';
    }

    if (previewKind === 'image') {
      return 'image';
    }

    return 'insert_drive_file';
  }

  getPreviewTypeLabel(): string {
    const previewKind = this.previewKind();

    if (previewKind === 'pdf') {
      return 'PDF';
    }

    if (previewKind === 'image') {
      return 'Imagen';
    }

    return 'Archivo';
  }

  download(): void {
    if (this.isDownloading()) {
      return;
    }

    this.isDownloading.set(true);
    this.errorMessage.set('');

    this.documentsService.download(this.document.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = globalThis.document.createElement('a');

        link.href = url;
        link.download = this.document.fileName;
        link.click();

        URL.revokeObjectURL(url);
        this.isDownloading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.getDocumentActionErrorMessage(error, 'descargar'));
        this.isDownloading.set(false);
      },
    });
  }

  private loadPreview(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.previewKind.set('unavailable');

    this.documentsService.view(this.document.id).subscribe({
      next: (blob) => {
        this.revokePreviewUrl();

        const mimeType = this.resolveMimeType(blob);
        const objectUrl = URL.createObjectURL(blob);

        this.previewUrl.set(objectUrl);

        if (mimeType === 'application/pdf') {
          this.previewKind.set('pdf');
          this.previewResourceUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
        } else if (mimeType === 'image/png' || mimeType === 'image/jpeg') {
          this.previewKind.set('image');
          this.previewResourceUrl.set(null);
        } else {
          this.previewKind.set('unsupported');
          this.previewResourceUrl.set(null);
        }

        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.previewKind.set('unavailable');
        this.errorMessage.set(this.getDocumentActionErrorMessage(error, 'ver'));
        this.isLoading.set(false);
      },
    });
  }

  private resolveMimeType(blob: Blob): string {
    const blobType = blob.type.trim();
    const documentType = this.document.mimeType?.trim() ?? '';

    return blobType || documentType;
  }

  private revokePreviewUrl(): void {
    const url = this.previewUrl();

    if (!url) {
      return;
    }

    URL.revokeObjectURL(url);
    this.previewUrl.set(null);
    this.previewResourceUrl.set(null);
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
