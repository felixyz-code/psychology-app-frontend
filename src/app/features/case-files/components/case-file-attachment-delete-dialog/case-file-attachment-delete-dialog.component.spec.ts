import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { CaseFileAttachment } from '../../models/case-file-attachment.models';
import { CaseFileAttachmentsService } from '../../services/case-file-attachments.service';
import {
  CaseFileAttachmentDeleteDialogComponent,
  CaseFileAttachmentDeleteDialogData,
} from './case-file-attachment-delete-dialog.component';

describe('CaseFileAttachmentDeleteDialogComponent', () => {
  let component: CaseFileAttachmentDeleteDialogComponent;
  let fixture: ComponentFixture<CaseFileAttachmentDeleteDialogComponent>;
  let mockAttachmentsService: {
    delete: ReturnType<typeof vi.fn>;
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

  const dialogData: CaseFileAttachmentDeleteDialogData = {
    attachment: mockAttachment,
  };

  beforeEach(async () => {
    mockAttachmentsService = {
      delete: vi.fn().mockReturnValue(of(mockAttachment)),
    };

    mockDialogRef = {
      close: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CaseFileAttachmentDeleteDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: CaseFileAttachmentsService, useValue: mockAttachmentsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseFileAttachmentDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create dialog', () => {
    expect(component).toBeTruthy();
  });

  it('should confirm deletion and close with true', () => {
    component.confirm();
    expect(mockAttachmentsService.delete).toHaveBeenCalledWith('cf-1', 'att-1');
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should handle deletion error', () => {
    mockAttachmentsService.delete.mockReturnValueOnce(throwError(() => new Error('Delete failed')));
    component.confirm();
    expect(component.errorMessage()).toContain('Ocurrió un error');
    expect(component.isDeleting()).toBe(false);
  });
});
