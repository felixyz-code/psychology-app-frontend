import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { DocumentUploadFormComponent } from './document-upload-form.component';
import { UploadDocumentRequest } from '../models/document.models';
import { DocumentUploadFlowStore } from '../services/document-upload-flow.store';

@Component({
  selector: 'app-document-upload-modal-dialog',
  standalone: true,
  imports: [MatDialogModule, DocumentUploadFormComponent],
  templateUrl: './document-upload-modal-dialog.component.html',
  styleUrl: './document-upload-modal-dialog.component.scss',
  providers: [DocumentUploadFlowStore],
})
export class DocumentUploadModalDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DocumentUploadModalDialogComponent, boolean>);
  readonly flow = inject(DocumentUploadFlowStore);

  constructor() {
    this.flow.loadCaseFileOptions();
  }

  submit(payload: UploadDocumentRequest): void {
    this.flow.submit(payload, () => {
      this.dialogRef.close(true);
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
