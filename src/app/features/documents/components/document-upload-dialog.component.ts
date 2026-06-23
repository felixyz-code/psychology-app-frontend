import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

import { AuthStore } from '../../../core/auth/auth.store';
import { DocumentsService } from '../services/documents.service';

interface DocumentUploadDialogData {
  caseFileId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

@Component({
  selector: 'app-document-upload-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './document-upload-dialog.component.html',
  styleUrl: './document-upload-dialog.component.scss',
})
export class DocumentUploadDialogComponent {
  private readonly data = inject<DocumentUploadDialogData>(MAT_DIALOG_DATA);
  private readonly authStore = inject(AuthStore);
  private readonly documentsService = inject(DocumentsService);
  private readonly dialogRef = inject(MatDialogRef<DocumentUploadDialogComponent, boolean>);

  readonly selectedFile = signal<File | null>(null);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedFile.set(file);
    this.errorMessage.set('');
  }

  submit(): void {
    const file = this.selectedFile();
    const validationError = this.validateFile(file);

    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    const uploadedById = this.authStore.user()?.id;

    if (!uploadedById) {
      this.errorMessage.set('No fue posible identificar al usuario autenticado.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.documentsService
      .upload(this.data.caseFileId, uploadedById, file as File)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('POST /documents/upload failed', {
            status: error?.status,
            body: error?.error,
            caseFileId: this.data.caseFileId,
            fileName: file?.name,
          });
          this.errorMessage.set('No fue posible subir el documento.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private validateFile(file: File | null): string {
    if (!file) {
      return 'Selecciona un archivo para subir.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo no puede ser mayor a 10 MB.';
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return 'Solo se permiten archivos PDF, JPG, JPEG o PNG.';
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'El tipo de archivo no esta permitido.';
    }

    return '';
  }
}
