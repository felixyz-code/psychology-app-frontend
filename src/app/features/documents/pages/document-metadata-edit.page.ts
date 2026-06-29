import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';

import { DocumentMetadataFormComponent } from '../components/document-metadata-form.component';
import { UpdateDocumentRequest } from '../models/document.models';
import { DocumentMetadataEditFlowStore } from '../services/document-metadata-edit-flow.store';

@Component({
  selector: 'app-document-metadata-edit-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule, DocumentMetadataFormComponent],
  templateUrl: './document-metadata-edit.page.html',
  styleUrl: './document-metadata-edit.page.scss',
  providers: [DocumentMetadataEditFlowStore],
})
export class DocumentMetadataEditPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly flow = inject(DocumentMetadataEditFlowStore);

  readonly documentId = this.route.snapshot.paramMap.get('id') ?? '';

  constructor() {
    this.flow.loadDocument(this.documentId);
  }

  submit(payload: UpdateDocumentRequest): void {
    this.flow.submit(this.documentId, payload, () => {
      void this.router.navigate(['/documents']);
    });
  }

  cancel(): void {
    void this.router.navigate(['/documents']);
  }

  retryLoad(): void {
    this.flow.loadDocument(this.documentId);
  }
}
