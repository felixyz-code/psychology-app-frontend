import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { Document } from '../models/document.models';

interface DocumentDetailDialogData {
  document: Document;
}

@Component({
  selector: 'app-document-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './document-detail-dialog.component.html',
  styleUrl: './document-detail-dialog.component.scss',
})
export class DocumentDetailDialogComponent {
  private readonly data = inject<DocumentDetailDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DocumentDetailDialogComponent>);

  readonly document = this.data.document;

  close(): void {
    this.dialogRef.close();
  }

  getDisplayValue(value?: string | null): string {
    return value?.trim() || 'No disponible';
  }
}
