import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { CaseFileAttachment } from '../../models/case-file-attachment.models';
import { CaseFileAttachmentsService } from '../../services/case-file-attachments.service';
import { CaseFileAttachmentsComponent } from './case-file-attachments.component';

describe('CaseFileAttachmentsComponent', () => {
  let component: CaseFileAttachmentsComponent;
  let fixture: ComponentFixture<CaseFileAttachmentsComponent>;
  let mockAttachmentsService: {
    getAttachments: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
    view: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockDialog: {
    open: ReturnType<typeof vi.fn>;
  };

  const mockAttachments: CaseFileAttachment[] = [
    {
      id: 'att-1',
      caseFileId: 'cf-1',
      uploadedById: 'user-1',
      fileName: 'uuid-1.pdf',
      originalName: 'estudio_neurologico.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048576,
      category: 'ESTUDIO_PREVIO',
      notes: 'Estudio previo de laboratorio',
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T10:00:00Z',
    },
    {
      id: 'att-2',
      caseFileId: 'cf-1',
      uploadedById: 'user-1',
      fileName: 'uuid-2.png',
      originalName: 'ine_tutor.png',
      mimeType: 'image/png',
      sizeBytes: 512000,
      category: 'IDENTIFICACION',
      notes: null,
      createdAt: '2026-01-02T12:00:00Z',
      updatedAt: '2026-01-02T12:00:00Z',
    },
  ];

  beforeEach(async () => {
    mockAttachmentsService = {
      getAttachments: vi.fn().mockReturnValue(of(mockAttachments)),
      upload: vi.fn(),
      download: vi.fn().mockReturnValue(of(new Blob())),
      view: vi.fn().mockReturnValue(of(new Blob())),
      delete: vi.fn().mockReturnValue(of(mockAttachments[0])),
    };

    mockDialog = {
      open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }),
    };

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob');
    globalThis.URL.revokeObjectURL = vi.fn();

    await TestBed.configureTestingModule({
      imports: [CaseFileAttachmentsComponent],
      providers: [
        { provide: CaseFileAttachmentsService, useValue: mockAttachmentsService },
      ],
    }).compileComponents();

    vi.spyOn(MatDialog.prototype, 'open').mockReturnValue({ afterClosed: () => of(true) } as any);

    fixture = TestBed.createComponent(CaseFileAttachmentsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('caseFileId', 'cf-1');
    fixture.detectChanges();
  });

  it('should create and load attachments list', () => {
    expect(component).toBeTruthy();
    expect(mockAttachmentsService.getAttachments).toHaveBeenCalledWith('cf-1');
    expect(component.attachments().length).toBe(2);
  });

  it('should format bytes correctly', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1048576)).toBe('1 MB');
  });

  it('should map category icons and labels correctly', () => {
    expect(component.getCategoryIcon('ESTUDIO_PREVIO')).toBe('science');
    expect(component.getCategoryIcon('REPORTE_ESCOLAR')).toBe('school');
    expect(component.getCategoryIcon('IDENTIFICACION')).toBe('badge');
    expect(component.getCategoryIcon('OTRO')).toBe('attach_file');
    expect(component.getCategoryLabel('ESTUDIO_PREVIO')).toBe('Estudio previo / Gabinete');
  });

  it('should validate allowed file extensions on drop/select', () => {
    const validFile = new File(['dummy'], 'study.pdf', { type: 'application/pdf' });
    component.handleFile(validFile);
    expect(component.selectedFile()).toEqual(validFile);
    expect(component.fileValidationError()).toBe('');

    const invalidFile = new File(['dummy'], 'malware.exe', { type: 'application/octet-stream' });
    component.handleFile(invalidFile);
    expect(component.selectedFile()).toBeNull();
    expect(component.fileValidationError()).toContain('Formato no permitido');
  });

  it('should upload a selected attachment successfully', () => {
    const validFile = new File(['dummy'], 'study.pdf', { type: 'application/pdf' });
    component.selectedFile.set(validFile);
    component.selectedCategory.set('ESTUDIO_PREVIO');
    component.notes.set('Nota de prueba');

    mockAttachmentsService.upload.mockReturnValue(of(mockAttachments[0]));

    component.uploadAttachment();

    expect(mockAttachmentsService.upload).toHaveBeenCalledWith({
      caseFileId: 'cf-1',
      category: 'ESTUDIO_PREVIO',
      notes: 'Nota de prueba',
      file: validFile,
    });
    expect(component.uploadSuccessMessage()).toContain('subido exitosamente');
    expect(component.selectedFile()).toBeNull();
  });

  it('should open preview dialog for PDF and image attachments', () => {
    component.preview(mockAttachments[0]);
    expect(MatDialog.prototype.open).toHaveBeenCalled();
  });

  it('should open delete confirmation dialog and reload list on delete', () => {
    component.openDeleteDialog(mockAttachments[0]);
    expect(MatDialog.prototype.open).toHaveBeenCalled();
    expect(mockAttachmentsService.getAttachments).toHaveBeenCalledTimes(2);
  });

  it('should handle drag and drop events', () => {
    const dragOverEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;
    component.onDragOver(dragOverEvent);
    expect(component.isDragging()).toBe(true);

    const dragLeaveEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;
    component.onDragLeave(dragLeaveEvent);
    expect(component.isDragging()).toBe(false);

    const dropEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: [new File(['dummy'], 'report.docx', { type: 'application/docx' })],
      },
    } as unknown as DragEvent;
    component.onDrop(dropEvent);
    expect(component.selectedFile()).not.toBeNull();
  });
});
