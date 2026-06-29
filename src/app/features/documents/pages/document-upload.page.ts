import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DocumentUploadFormComponent } from '../components/document-upload-form.component';
import { UploadDocumentRequest } from '../models/document.models';
import { DocumentUploadFlowStore } from '../services/document-upload-flow.store';

@Component({
  selector: 'app-document-upload-page',
  standalone: true,
  imports: [DocumentUploadFormComponent],
  templateUrl: './document-upload.page.html',
  providers: [DocumentUploadFlowStore],
})
export class DocumentUploadPage {
  private readonly router = inject(Router);
  readonly flow = inject(DocumentUploadFlowStore);

  constructor() {
    this.flow.loadCaseFileOptions();
  }

  submit(payload: UploadDocumentRequest): void {
    this.flow.submit(payload, () => {
      void this.router.navigate(['/documents']);
    });
  }

  cancel(): void {
    void this.router.navigate(['/documents']);
  }
}
