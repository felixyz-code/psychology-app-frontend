import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileStore } from '../../../../core/user-profile/user-profile.store';
import { DigitalSignaturePadComponent } from './digital-signature-pad.component';

describe('DigitalSignaturePadComponent', () => {
  let component: DigitalSignaturePadComponent;
  let fixture: ComponentFixture<DigitalSignaturePadComponent>;
  let mockStore: {
    signatureUrl: ReturnType<typeof signal<string | null>>;
    hasSignature: ReturnType<typeof signal<boolean>>;
    isUploadingSignature: ReturnType<typeof signal<boolean>>;
    uploadSignature: ReturnType<typeof vi.fn>;
    removeSignature: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockStore = {
      signatureUrl: signal<string | null>(null),
      hasSignature: signal<boolean>(false),
      isUploadingSignature: signal<boolean>(false),
      uploadSignature: vi.fn(),
      removeSignature: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DigitalSignaturePadComponent],
      providers: [{ provide: UserProfileStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(DigitalSignaturePadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes canvas context on view init', () => {
    expect(component.canvasRef).toBeDefined();
    expect(component.isDrawing()).toBe(false);
    expect(component.hasCanvasStrokes()).toBe(false);
  });

  it('clears canvas strokes when clearCanvas is called', () => {
    component.hasCanvasStrokes.set(true);
    component.clearCanvas();
    expect(component.hasCanvasStrokes()).toBe(false);
  });

  it('rejects file larger than 1 MiB during file selection', () => {
    const largeFile = new File([''], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 });

    const event = {
      target: {
        files: [largeFile],
        value: 'dummy',
      },
    } as unknown as Event;

    component.onFileSelected(event);

    expect(component.uploadError()).toContain('1 MiB');
    expect(mockStore.uploadSignature).not.toHaveBeenCalled();
  });
});
