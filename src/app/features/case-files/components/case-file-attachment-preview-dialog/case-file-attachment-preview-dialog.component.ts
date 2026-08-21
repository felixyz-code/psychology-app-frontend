import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CaseFileAttachment } from '../../models/case-file-attachment.models';
import { CaseFileAttachmentsService } from '../../services/case-file-attachments.service';

export interface CaseFileAttachmentPreviewDialogData {
  attachment: CaseFileAttachment;
}

type PreviewKind = 'pdf' | 'image' | 'unsupported' | 'unavailable';

const PDF_VIEWER_OPEN_PARAMETERS = '#toolbar=1&navpanes=0&zoom=80';

@Component({
  selector: 'app-case-file-attachment-preview-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './case-file-attachment-preview-dialog.component.html',
  styleUrl: './case-file-attachment-preview-dialog.component.scss',
})
export class CaseFileAttachmentPreviewDialogComponent implements OnDestroy {
  private readonly data = inject<CaseFileAttachmentPreviewDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CaseFileAttachmentPreviewDialogComponent>);
  private readonly attachmentsService = inject(CaseFileAttachmentsService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly attachment = this.data.attachment;
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
      return 'Documento PDF';
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

    this.attachmentsService
      .download(this.attachment.caseFileId, this.attachment.id)
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = globalThis.document.createElement('a');

          link.href = url;
          link.download = this.attachment.originalName;
          link.click();

          URL.revokeObjectURL(url);
          this.isDownloading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo descargar el archivo adjunto.');
          this.isDownloading.set(false);
        },
      });
  }

  retry(): void {
    this.loadPreview();
  }

  private loadPreview(): void {
    const mimeType = this.attachment.mimeType.toLowerCase();

    if (
      mimeType !== 'application/pdf' &&
      !mimeType.startsWith('image/')
    ) {
      this.previewKind.set('unsupported');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.attachmentsService
      .view(this.attachment.caseFileId, this.attachment.id)
      .subscribe({
        next: (blob) => {
          this.revokePreviewUrl();

          const blobUrl = URL.createObjectURL(blob);
          this.previewUrl.set(blobUrl);

          if (blob.type === 'application/pdf' || mimeType === 'application/pdf') {
            this.previewKind.set('pdf');
            this.previewResourceUrl.set(
              this.sanitizer.bypassSecurityTrustResourceUrl(
                `${blobUrl}${PDF_VIEWER_OPEN_PARAMETERS}`,
              ),
            );
          } else {
            this.previewKind.set('image');
            this.previewResourceUrl.set(
              this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl),
            );
          }

          this.isLoading.set(false);
        },
        error: () => {
          this.previewKind.set('unavailable');
          this.errorMessage.set('No se pudo cargar la vista previa del archivo.');
          this.isLoading.set(false);
        },
      });
  }

  private revokePreviewUrl(): void {
    const previewUrl = this.previewUrl();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      this.previewUrl.set(null);
      this.previewResourceUrl.set(null);
    }
  }
}
