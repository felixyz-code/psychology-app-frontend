import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

import { Document } from '../models/document.models';
import { DocumentsService } from '../services/documents.service';

interface DocumentDeleteDialogData {
  document: Document;
}

@Component({
  selector: 'app-document-delete-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './document-delete-dialog.component.html',
  styleUrl: './document-delete-dialog.component.scss',
})
export class DocumentDeleteDialogComponent {
  private readonly data = inject<DocumentDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly documentsService = inject(DocumentsService);
  private readonly dialogRef = inject(MatDialogRef<DocumentDeleteDialogComponent, boolean>);

  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');
  readonly document = this.data.document;

  confirmDelete(): void {
    this.isDeleting.set(true);
    this.errorMessage.set('');

    this.documentsService
      .delete(this.document.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error) => {
          if (error?.status === 401 || error?.status === 403) {
            this.errorMessage.set('No tienes permisos para eliminar este documento.');
            return;
          }

          if (error?.status === 404) {
            this.errorMessage.set('El documento ya no esta disponible.');
            return;
          }

          this.errorMessage.set('No fue posible eliminar el documento.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
