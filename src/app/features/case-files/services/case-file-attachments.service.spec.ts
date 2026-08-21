import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { CaseFileAttachment } from '../models/case-file-attachment.models';
import { CaseFileAttachmentsService } from './case-file-attachments.service';

describe('CaseFileAttachmentsService', () => {
  let service: CaseFileAttachmentsService;
  let httpTesting: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const caseFileId = 'cf-123';
  const attachmentId = 'att-456';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CaseFileAttachmentsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CaseFileAttachmentsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch attachments for a case file', () => {
    const mockList: CaseFileAttachment[] = [
      {
        id: attachmentId,
        caseFileId,
        uploadedById: 'user-1',
        fileName: 'uuid.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        category: 'ESTUDIO_PREVIO',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    service.getAttachments(caseFileId).subscribe((attachments) => {
      expect(attachments).toEqual(mockList);
    });

    const req = httpTesting.expectOne(`${apiUrl}/case-files/${caseFileId}/attachments`);
    expect(req.request.method).toBe('GET');
    req.flush(mockList);
  });

  it('should upload an attachment with FormData', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const mockResponse: CaseFileAttachment = {
      id: attachmentId,
      caseFileId,
      uploadedById: 'user-1',
      fileName: 'uuid.pdf',
      originalName: 'test.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 7,
      category: 'ESTUDIO_PREVIO',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    service
      .upload({
        caseFileId,
        category: 'ESTUDIO_PREVIO',
        notes: 'Clinical study',
        file,
      })
      .subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

    const req = httpTesting.expectOne(`${apiUrl}/case-files/${caseFileId}/attachments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(mockResponse);
  });

  it('should download an attachment as blob', () => {
    const mockBlob = new Blob(['sample data'], { type: 'application/pdf' });

    service.download(caseFileId, attachmentId).subscribe((blob) => {
      expect(blob).toEqual(mockBlob);
    });

    const req = httpTesting.expectOne(
      `${apiUrl}/case-files/${caseFileId}/attachments/${attachmentId}/download`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockBlob);
  });

  it('should request view blob for an attachment', () => {
    const mockBlob = new Blob(['sample image data'], { type: 'image/png' });

    service.view(caseFileId, attachmentId).subscribe((blob) => {
      expect(blob).toEqual(mockBlob);
    });

    const req = httpTesting.expectOne(
      `${apiUrl}/case-files/${caseFileId}/attachments/${attachmentId}/view`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockBlob);
  });

  it('should delete an attachment', () => {
    service.delete(caseFileId, attachmentId).subscribe();

    const req = httpTesting.expectOne(
      `${apiUrl}/case-files/${caseFileId}/attachments/${attachmentId}`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
