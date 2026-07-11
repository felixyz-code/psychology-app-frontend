import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { DocumentsService } from './documents.service';
import { DocumentMetadataEditFlowStore } from './document-metadata-edit-flow.store';

describe('DocumentMetadataEditFlowStore', () => {
  let documentsService: { getById: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    documentsService = { getById: vi.fn(), update: vi.fn() };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('reports a missing id without making a request', () => {
    const store = createStore();

    store.loadDocument('');

    expect(documentsService.getById).not.toHaveBeenCalled();
    expect(store.isLoading()).toBe(false);
    expect(store.loadErrorMessage()).toBe('No se encontro el identificador del documento.');
  });

  it('loads document metadata and clears the loading state', () => {
    documentsService.getById.mockReturnValue(of(createDocument()));
    const store = createStore();

    store.loadDocument('document-1');

    expect(documentsService.getById).toHaveBeenCalledWith('document-1');
    expect(store.document()).toEqual(createDocument());
    expect(store.isLoading()).toBe(false);
  });

  it('exposes a load error and clears a stale document', () => {
    documentsService.getById.mockReturnValue(throwError(() => new Error('Unavailable')));
    const store = createStore();

    store.loadDocument('document-1');

    expect(store.document()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(store.loadErrorMessage()).toBe('No fue posible cargar el documento.');
  });

  it('submits metadata once, prevents duplicate saving, and invokes success', () => {
    const pendingRequest = new Subject<unknown>();
    documentsService.update.mockReturnValue(pendingRequest);
    const onSuccess = vi.fn();
    const store = createStore();
    const payload = { fileName: 'actualizado.pdf' };

    store.submit('document-1', payload, onSuccess);
    store.submit('document-1', payload, onSuccess);

    expect(documentsService.update).toHaveBeenCalledTimes(1);
    expect(store.isSaving()).toBe(true);

    pendingRequest.next({});
    pendingRequest.complete();

    expect(store.isSaving()).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows an error and permits retry after a failed metadata update', () => {
    documentsService.update.mockReturnValueOnce(throwError(() => new Error('Unavailable'))).mockReturnValueOnce(of({}));
    const onSuccess = vi.fn();
    const store = createStore();

    store.submit('document-1', { fileName: 'actualizado.pdf' }, onSuccess);

    expect(store.saveErrorMessage()).toBe('No fue posible guardar los cambios del documento.');
    expect(onSuccess).not.toHaveBeenCalled();

    store.submit('document-1', { fileName: 'actualizado.pdf' }, onSuccess);

    expect(documentsService.update).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  function createStore(): DocumentMetadataEditFlowStore {
    TestBed.configureTestingModule({
      providers: [DocumentMetadataEditFlowStore, { provide: DocumentsService, useValue: documentsService }],
    });

    return TestBed.inject(DocumentMetadataEditFlowStore);
  }
});

function createDocument() {
  return {
    id: 'document-1',
    caseFileId: 'case-file-1',
    uploadedById: 'psychologist-1',
    fileName: 'informe.pdf',
    filePath: 'documents/informe.pdf',
    uploadedAt: '2026-07-02T10:00:00.000Z',
    updatedAt: '2026-07-02T10:00:00.000Z',
  };
}
