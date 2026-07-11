import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';

import { DocumentsService } from '../services/documents.service';
import { DocumentDeleteDialogComponent } from './document-delete-dialog.component';

describe('DocumentDeleteDialogComponent', () => {
  let documentsService: { delete: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    documentsService = { delete: vi.fn() };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('deletes the supplied document once and closes only after success', () => {
    const pendingRequest = new Subject<void>();
    documentsService.delete.mockReturnValue(pendingRequest);
    const { component, dialogRef } = createComponent();

    component.confirmDelete();
    component.confirmDelete();

    expect(documentsService.delete).toHaveBeenCalledTimes(1);
    expect(documentsService.delete).toHaveBeenCalledWith('document-1');
    expect(component.isDeleting()).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();

    pendingRequest.next();
    pendingRequest.complete();

    expect(component.isDeleting()).toBe(false);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it.each([
    [401, 'No tienes permisos para eliminar este documento.'],
    [404, 'El documento ya no esta disponible.'],
    [500, 'No fue posible eliminar el documento.'],
  ])('keeps the dialog open and shows the correct error for status %i', (status, message) => {
    documentsService.delete.mockReturnValue(throwError(() => ({ status })));
    const { component, dialogRef } = createComponent();

    component.confirmDelete();

    expect(component.isDeleting()).toBe(false);
    expect(component.errorMessage()).toBe(message);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('allows retry after a failed deletion', () => {
    documentsService.delete.mockReturnValueOnce(throwError(() => ({ status: 500 }))).mockReturnValueOnce(of(void 0));
    const { component, dialogRef } = createComponent();

    component.confirmDelete();
    component.confirmDelete();

    expect(documentsService.delete).toHaveBeenCalledTimes(2);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  function createComponent(): {
    component: DocumentDeleteDialogComponent;
    dialogRef: { close: ReturnType<typeof vi.fn> };
  } {
    const dialogRef = { close: vi.fn() };

    TestBed.configureTestingModule({
      imports: [DocumentDeleteDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { document: createDocument() } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: DocumentsService, useValue: documentsService },
      ],
    });

    return { component: TestBed.createComponent(DocumentDeleteDialogComponent).componentInstance, dialogRef };
  }
});

function createDocument() {
  return {
    id: 'document-1',
    caseFileId: 'case-file-1',
    uploadedById: 'psychologist-1',
    fileName: 'informe.pdf',
    filePath: 'documents/informe.pdf',
    mimeType: 'application/pdf',
    uploadedAt: '2026-07-02T10:00:00.000Z',
    updatedAt: '2026-07-02T10:00:00.000Z',
  };
}
