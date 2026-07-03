import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { DocumentUploadFormComponent } from './document-upload-form.component';
import { UploadDocumentRequest } from '../models/document.models';
import { DocumentUploadFlowStore } from '../services/document-upload-flow.store';

interface DocumentUploadModalDialogData {
  caseFileId?: string;
}

@Component({
  selector: 'app-document-upload-modal-dialog',
  standalone: true,
  imports: [MatDialogModule, DocumentUploadFormComponent],
  templateUrl: './document-upload-modal-dialog.component.html',
  styleUrl: './document-upload-modal-dialog.component.scss',
  providers: [DocumentUploadFlowStore],
})
export class DocumentUploadModalDialogComponent {
  private readonly data = inject<DocumentUploadModalDialogData | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly dialogRef = inject(MatDialogRef<DocumentUploadModalDialogComponent, boolean>);
  readonly flow = inject(DocumentUploadFlowStore);

  constructor() {
    const caseFileId = this.data?.caseFileId?.trim();

    if (caseFileId) {
      this.flow.configureFixedCaseFile(caseFileId);
      return;
    }

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

  isCaseFileFixed(): boolean {
    return !!this.flow.fixedCaseFileId();
  }
}
