import { inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { Document, UpdateDocumentRequest } from '../models/document.models';
import { DocumentsService } from './documents.service';

@Injectable()
export class DocumentMetadataEditFlowStore {
  private readonly documentsService = inject(DocumentsService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadErrorMessage = signal('');
  readonly saveErrorMessage = signal('');
  readonly document = signal<Document | null>(null);

  loadDocument(documentId: string): void {
    if (!documentId) {
      this.document.set(null);
      this.isLoading.set(false);
      this.loadErrorMessage.set('No se encontro el identificador del documento.');
      return;
    }

    this.isLoading.set(true);
    this.loadErrorMessage.set('');
    this.saveErrorMessage.set('');

    this.documentsService
      .getById(documentId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (document) => {
          this.document.set(document);
        },
        error: () => {
          this.document.set(null);
          this.loadErrorMessage.set('No fue posible cargar el documento.');
        },
      });
  }

  submit(documentId: string, payload: UpdateDocumentRequest, onSuccess: () => void): void {
    if (!documentId || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.saveErrorMessage.set('');

    this.documentsService
      .update(documentId, payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          onSuccess();
        },
        error: () => {
          this.saveErrorMessage.set('No fue posible guardar los cambios del documento.');
        },
      });
  }
}
