import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';

import { DocumentsService } from '../services/documents.service';
import { DocumentPreviewDialogComponent } from './document-preview-dialog.component';

describe('DocumentPreviewDialogComponent', () => {
  let documentsService: { view: ReturnType<typeof vi.fn>; download: ReturnType<typeof vi.fn> };
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    documentsService = { view: vi.fn(), download: vi.fn() };
    createObjectURL = vi.fn(() => 'blob:document-preview');
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('creates a PDF preview object URL and safe resource with viewer parameters', () => {
    documentsService.view.mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    const { component } = createComponent();

    expect(documentsService.view).toHaveBeenCalledWith('document-1');
    expect(component.isLoading()).toBe(false);
    expect(component.previewKind()).toBe('pdf');
    expect(component.previewUrl()).toBe('blob:document-preview');
    expect(component.previewResourceUrl()).toBeTruthy();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('renders an image preview when the blob has an image type', () => {
    documentsService.view.mockReturnValue(of(new Blob(['image'], { type: 'image/png' })));
    const { component } = createComponent({ mimeType: null });

    expect(component.previewKind()).toBe('image');
    expect(component.previewResourceUrl()).toBeNull();
    expect(component.getPreviewIcon()).toBe('image');
  });

  it('uses the document mime type when the view blob has no type', () => {
    documentsService.view.mockReturnValue(of(new Blob(['image'])));
    const { component } = createComponent({ mimeType: 'image/jpeg' });

    expect(component.previewKind()).toBe('image');
  });

  it.each([
    [401, 'No tienes permisos para ver este documento.'],
    [404, 'El documento ya no esta disponible.'],
    [500, 'No fue posible ver el documento.'],
  ])('shows a view error and does not create an object URL for status %i', (status, message) => {
    documentsService.view.mockReturnValue(throwError(() => ({ status })));
    const { component } = createComponent();

    expect(component.isLoading()).toBe(false);
    expect(component.previewKind()).toBe('unavailable');
    expect(component.errorMessage()).toBe(message);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('revokes the preview object URL when destroyed', () => {
    documentsService.view.mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    const { component } = createComponent();

    component.ngOnDestroy();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:document-preview');
    expect(component.previewUrl()).toBeNull();
  });

  it('downloads with a temporary anchor, document filename, and revoked object URL', () => {
    documentsService.view.mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    documentsService.download.mockReturnValue(of(new Blob(['download'], { type: 'application/pdf' })));
    const click = vi.fn();
    const anchor = { href: '', download: '', click } as unknown as HTMLAnchorElement;
    const { component } = createComponent();
    const createElement = vi.spyOn(globalThis.document, 'createElement').mockReturnValue(anchor);

    component.download();

    expect(documentsService.download).toHaveBeenCalledWith('document-1');
    expect(createElement).toHaveBeenCalledWith('a');
    expect(anchor.href).toBe('blob:document-preview');
    expect(anchor.download).toBe('informe.pdf');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:document-preview');
    expect(component.isDownloading()).toBe(false);
  });

  it('shows download errors and prevents a second download while one is pending', () => {
    documentsService.view.mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    const pendingDownload = new Subject<Blob>();
    documentsService.download.mockReturnValue(pendingDownload);
    const { component } = createComponent();

    component.download();
    component.download();

    expect(documentsService.download).toHaveBeenCalledTimes(1);
    expect(component.isDownloading()).toBe(true);

    pendingDownload.error({ status: 500 });

    expect(component.isDownloading()).toBe(false);
    expect(component.errorMessage()).toBe('No fue posible descargar el documento.');
  });

  function createComponent(overrides: { mimeType?: string | null } = {}): {
    component: DocumentPreviewDialogComponent;
    dialogRef: { close: ReturnType<typeof vi.fn> };
  } {
    const dialogRef = { close: vi.fn() };

    TestBed.configureTestingModule({
      imports: [DocumentPreviewDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { document: createDocument(overrides) } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: DocumentsService, useValue: documentsService },
      ],
    });

    return { component: TestBed.createComponent(DocumentPreviewDialogComponent).componentInstance, dialogRef };
  }
});

function createDocument(overrides: { mimeType?: string | null } = {}) {
  return {
    id: 'document-1',
    caseFileId: 'case-file-1',
    uploadedById: 'psychologist-1',
    fileName: 'informe.pdf',
    filePath: 'documents/informe.pdf',
    mimeType: 'application/pdf',
    uploadedAt: '2026-07-02T10:00:00.000Z',
    updatedAt: '2026-07-02T10:00:00.000Z',
    ...overrides,
  };
}
