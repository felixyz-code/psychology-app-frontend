import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { Document, UpdateDocumentRequest } from '../models/document.models';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(DocumentsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('gets the global documents list', () => {
    let result: Document[] | undefined;

    service.getAll().subscribe((documents) => (result = documents));

    const request = httpTesting.expectOne('/api/documents');
    expect(request.request.method).toBe('GET');
    request.flush([createDocument()]);

    expect(result).toEqual([createDocument()]);
  });

  it('propagates global list errors without transforming them', () => {
    let receivedError: unknown;

    service.getAll().subscribe({ error: (error) => (receivedError = error) });

    httpTesting.expectOne('/api/documents').flush('Unavailable', { status: 503, statusText: 'Service Unavailable' });

    expect(receivedError).toMatchObject({ status: 503, statusText: 'Service Unavailable' });
  });

  it('gets documents for a case file', () => {
    service.getByCaseFile('case-file-1').subscribe();

    const request = httpTesting.expectOne('/api/documents/case-file/case-file-1');
    expect(request.request.method).toBe('GET');
    request.flush([createDocument()]);
  });

  it('gets document metadata by id', () => {
    let result: Document | undefined;

    service.getById('document-1').subscribe((document) => (result = document));

    const request = httpTesting.expectOne('/api/documents/document-1');
    expect(request.request.method).toBe('GET');
    request.flush(createDocument());

    expect(result).toEqual(createDocument());
  });

  it('updates document metadata with the supplied payload', () => {
    const payload: UpdateDocumentRequest = { fileName: 'informe-actualizado.pdf', mimeType: 'application/pdf' };

    service.update('document-1', payload).subscribe();

    const request = httpTesting.expectOne('/api/documents/document-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush({ ...createDocument(), ...payload });
  });

  it('uploads the file and case file id as multipart form data', () => {
    const file = new File(['clinical content'], 'informe.pdf', { type: 'application/pdf' });

    service.upload('case-file-1', file).subscribe();

    const request = httpTesting.expectOne('/api/documents/upload');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect(request.request.body.get('file')).toBe(file);
    expect(request.request.body.get('caseFileId')).toBe('case-file-1');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush(createDocument());
  });

  it('deletes a document by id', () => {
    service.delete('document-1').subscribe();

    const request = httpTesting.expectOne('/api/documents/document-1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('gets a view blob', () => {
    let result: Blob | undefined;

    service.view('document-1').subscribe((blob) => (result = blob));

    const request = httpTesting.expectOne('/api/documents/document-1/view');
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    request.flush(blob);

    expect(result).toEqual(blob);
  });

  it('gets a download blob', () => {
    service.download('document-1').subscribe();

    const request = httpTesting.expectOne('/api/documents/document-1/download');
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });

  const errorOperations: [string, (service: DocumentsService) => Observable<unknown>][] = [
    ['case-file list', (service: DocumentsService) => service.getByCaseFile('case-file-1')],
    ['metadata', (service: DocumentsService) => service.getById('document-1')],
    ['update', (service: DocumentsService) => service.update('document-1', { fileName: 'informe.pdf' })],
    ['upload', (service: DocumentsService) => service.upload('case-file-1', new File(['content'], 'informe.pdf'))],
    ['delete', (service: DocumentsService) => service.delete('document-1')],
    ['view', (service: DocumentsService) => service.view('document-1')],
    ['download', (service: DocumentsService) => service.download('document-1')],
  ];

  it.each(errorOperations)('propagates %s HTTP errors without transforming them', (_operation, operation) => {
    let receivedError: unknown;

    operation(service).subscribe({ error: (error) => (receivedError = error) });

    const request = httpTesting.expectOne((request) => request.url.startsWith('/api/documents'));

    if (request.request.responseType === 'blob') {
      request.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
    } else {
      request.flush('Unavailable', { status: 500, statusText: 'Internal Server Error' });
    }

    expect(receivedError).toMatchObject({ status: 500, statusText: 'Internal Server Error' });
  });
});

function createDocument(): Document {
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
