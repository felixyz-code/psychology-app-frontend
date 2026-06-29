import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DocumentMetadataFormComponent } from './document-metadata-form.component';
import { UpdateDocumentRequest } from '../models/document.models';
import { DocumentMetadataEditFlowStore } from '../services/document-metadata-edit-flow.store';

interface DocumentMetadataEditDialogData {
  documentId: string;
}

@Component({
  selector: 'app-document-metadata-edit-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatProgressSpinnerModule, DocumentMetadataFormComponent],
  templateUrl: './document-metadata-edit-dialog.component.html',
  styleUrl: './document-metadata-edit-dialog.component.scss',
  providers: [DocumentMetadataEditFlowStore],
})
export class DocumentMetadataEditDialogComponent {
  private readonly data = inject<DocumentMetadataEditDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DocumentMetadataEditDialogComponent, boolean>);
  readonly flow = inject(DocumentMetadataEditFlowStore);

  constructor() {
    this.flow.loadDocument(this.data.documentId);
  }

  submit(payload: UpdateDocumentRequest): void {
    this.flow.submit(this.data.documentId, payload, () => {
      this.dialogRef.close(true);
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  retryLoad(): void {
    this.flow.loadDocument(this.data.documentId);
  }
}
