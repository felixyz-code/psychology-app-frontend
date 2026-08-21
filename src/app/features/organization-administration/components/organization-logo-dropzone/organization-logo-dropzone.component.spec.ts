import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { OrganizationLogoDropzoneComponent } from './organization-logo-dropzone.component';
import { OrganizationLogoStore } from '../../../../core/organization-logo/organization-logo.store';
import { OrganizationLogoResponse } from '../../models/organization-logo.models';

describe('OrganizationLogoDropzoneComponent', () => {
  let fixture: ComponentFixture<OrganizationLogoDropzoneComponent>;
  let component: OrganizationLogoDropzoneComponent;
  let mockLogoStore: {
    logo: ReturnType<typeof signal<OrganizationLogoResponse | null>>;
    state: ReturnType<typeof signal<string>>;
    previewUrl: ReturnType<typeof signal<string | null>>;
    selectedFile: ReturnType<typeof signal<File | null>>;
    fileError: ReturnType<typeof signal<string>>;
    errorMessage: ReturnType<typeof signal<string>>;
    successMessage: ReturnType<typeof signal<string>>;
    conflictMessage: ReturnType<typeof signal<string>>;
    mutationState: ReturnType<typeof signal<string>>;
    selectFile: ReturnType<typeof vi.fn>;
    uploadSelected: ReturnType<typeof vi.fn>;
    loadCurrent: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockLogoStore = {
      logo: signal(null),
      state: signal('ABSENT'),
      previewUrl: signal(null),
      selectedFile: signal(null),
      fileError: signal(''),
      errorMessage: signal(''),
      successMessage: signal(''),
      conflictMessage: signal(''),
      mutationState: signal('IDLE'),
      selectFile: vi.fn(),
      uploadSelected: vi.fn(),
      loadCurrent: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [OrganizationLogoDropzoneComponent],
      providers: [{ provide: OrganizationLogoStore, useValue: mockLogoStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationLogoDropzoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders empty logo state when no logo is present', () => {
    expect(component.presentLogo()).toBeNull();
  });

  it('updates drag state on dragover and dragleave', () => {
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;

    component.onDragOver(event);
    expect(component.isDragOver()).toBe(true);

    const leaveEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;
    component.onDragLeave(leaveEvent);
    expect(component.isDragOver()).toBe(false);
  });

  it('validates file size up to 2 MiB', () => {
    const oversizedFile = new File(['a'.repeat(2 * 1024 * 1024 + 10)], 'logo.png', {
      type: 'image/png',
    });
    Object.defineProperty(oversizedFile, 'size', {
      value: 2 * 1024 * 1024 + 10,
    });

    const dropEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: { files: [oversizedFile] },
    } as unknown as DragEvent;

    component.onDrop(dropEvent);
    expect(component.localFileError()).toContain('2 MiB');
    expect(mockLogoStore.selectFile).toHaveBeenCalledWith(null);
  });

  it('rejects unsupported file formats', () => {
    const invalidFile = new File(['content'], 'logo.gif', {
      type: 'image/gif',
    });

    const dropEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: { files: [invalidFile] },
    } as unknown as DragEvent;

    component.onDrop(dropEvent);
    expect(component.localFileError()).toContain('Formato no soportado');
  });

  it('triggers upload on valid selection', () => {
    component.upload();
    expect(mockLogoStore.uploadSelected).toHaveBeenCalled();
  });

  it('emits removeRequested output event when requested', () => {
    const emitSpy = vi.spyOn(component.removeRequested, 'emit');
    component.requestRemove();
    expect(emitSpy).toHaveBeenCalled();
  });
});
