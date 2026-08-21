import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { CaseFileAttachment } from '../../models/case-file-attachment.models';
import { CaseFileAttachmentsService } from '../../services/case-file-attachments.service';
import {
  CaseFileAttachmentPreviewDialogComponent,
  CaseFileAttachmentPreviewDialogData,
} from './case-file-attachment-preview-dialog.component';

describe('CaseFileAttachmentPreviewDialogComponent', () => {
  let component: CaseFileAttachmentPreviewDialogComponent;
  let fixture: ComponentFixture<CaseFileAttachmentPreviewDialogComponent>;
  let mockAttachmentsService: {
    view: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
  };
  let mockDialogRef: {
    close: ReturnType<typeof vi.fn>;
  };

  const mockAttachment: CaseFileAttachment = {
    id: 'att-1',
    caseFileId: 'cf-1',
    uploadedById: 'u-1',
    fileName: 'uuid.pdf',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    category: 'ESTUDIO_PREVIO',
    notes: 'Test note',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const dialogData: CaseFileAttachmentPreviewDialogData = {
    attachment: mockAttachment,
  };

  beforeEach(async () => {
    mockAttachmentsService = {
      view: vi.fn().mockReturnValue(of(new Blob(['pdf content'], { type: 'application/pdf' }))),
      download: vi.fn().mockReturnValue(of(new Blob(['pdf content'], { type: 'application/pdf' }))),
    };

    mockDialogRef = {
      close: vi.fn(),
    };

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob');
    globalThis.URL.revokeObjectURL = vi.fn();

    await TestBed.configureTestingModule({
      imports: [CaseFileAttachmentPreviewDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: CaseFileAttachmentsService, useValue: mockAttachmentsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseFileAttachmentPreviewDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load PDF preview', () => {
    expect(component).toBeTruthy();
    expect(component.previewKind()).toBe('pdf');
    expect(mockAttachmentsService.view).toHaveBeenCalledWith('cf-1', 'att-1');
  });

  it('should close dialog when requested', () => {
    component.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should handle view error gracefully', () => {
    mockAttachmentsService.view.mockReturnValueOnce(throwError(() => new Error('Load failed')));
    component.retry();

    expect(component.errorMessage()).toBe('No se pudo cargar la vista previa del archivo.');
    expect(component.previewKind()).toBe('unavailable');
  });
});
