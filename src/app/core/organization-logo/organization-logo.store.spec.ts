import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { OrganizationLogoResponse } from '../../features/organization-administration/models/organization-logo.models';
import { OrganizationLogoService } from '../../features/organization-administration/services/organization-logo.service';
import {
  TenantContextStore,
  TenantStateInvalidation,
} from '../tenant-context/tenant-context.store';
import { OrganizationLogoStore } from './organization-logo.store';

describe('OrganizationLogoStore', () => {
  let store: OrganizationLogoStore;
  let organizationId: ReturnType<typeof signal<string | null>>;
  let generation: ReturnType<typeof signal<number>>;
  let invalidations: Subject<TenantStateInvalidation>;
  let metadataReads: ControlledRequest<OrganizationLogoResponse>[];
  let contentReads: ControlledRequest<Blob>[];
  let uploads: ControlledRequest<OrganizationLogoResponse>[];
  let removals: ControlledRequest<OrganizationLogoResponse>[];
  let api: {
    getMetadata: ReturnType<typeof vi.fn>;
    getContent: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let originalCreateObjectURL: typeof URL.createObjectURL | undefined;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined;
  let objectUrlSequence: number;

  beforeEach(() => {
    organizationId = signal<string | null>('organization-a');
    generation = signal(1);
    invalidations = new Subject<TenantStateInvalidation>();
    metadataReads = [];
    contentReads = [];
    uploads = [];
    removals = [];
    objectUrlSequence = 0;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    createObjectURL = vi.fn(() => `blob:logo-${++objectUrlSequence}`);
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    api = {
      getMetadata: vi.fn((requestedOrganizationId: string) =>
        controlled(metadataReads, requestedOrganizationId),
      ),
      getContent: vi.fn((requestedOrganizationId: string) =>
        controlled(contentReads, requestedOrganizationId),
      ),
      upload: vi.fn((requestedOrganizationId: string) =>
        controlled(uploads, requestedOrganizationId),
      ),
      remove: vi.fn((requestedOrganizationId: string) =>
        controlled(removals, requestedOrganizationId),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationLogoStore,
        { provide: OrganizationLogoService, useValue: api },
        {
          provide: TenantContextStore,
          useValue: {
            selectedOrganizationId: organizationId,
            switchGeneration: generation,
            invalidations: invalidations.asObservable(),
          },
        },
      ],
    });
    store = TestBed.inject(OrganizationLogoStore);
    flushEffects();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    restoreUrlMethod('createObjectURL', originalCreateObjectURL);
    restoreUrlMethod('revokeObjectURL', originalRevokeObjectURL);
  });

  it('publishes ABSENT metadata without loading content or creating an object URL', () => {
    const canonical = absentLogo();
    metadataReads[0].subject.next(canonical);

    expect(store.logo()).toBe(canonical);
    expect(store.state()).toBe('ABSENT');
    expect(store.owner()).toEqual({ organizationId: 'organization-a', generation: 1 });
    expect(api.getContent).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('loads PRESENT protected content and publishes only an accepted object URL', () => {
    const canonical = presentLogo();
    metadataReads[0].subject.next(canonical);
    expect(api.getContent).toHaveBeenCalledWith('organization-a');

    const blob = new Blob(['png'], { type: 'image/png' });
    contentReads[0].subject.next(blob);

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(store.logo()).toBe(canonical);
    expect(store.previewUrl()).toBe('blob:logo-1');
    expect(store.state()).toBe('PRESENT');
  });

  it('allows only C to publish after adversarial A to B to C metadata completion', () => {
    switchTenant('organization-b', 2);
    switchTenant('organization-c', 3);

    metadataReads[1].subject.next(absentLogo());
    metadataReads[0].subject.next(presentLogo({ updatedAt: 'a' }));
    expect(store.logo()).toBeNull();
    expect(api.getContent).not.toHaveBeenCalled();

    const canonicalC = presentLogo({ updatedAt: 'c', mimeType: 'image/jpeg' });
    metadataReads[2].subject.next(canonicalC);
    expect(contentReads[0].organizationId).toBe('organization-c');
    contentReads[0].subject.next(new Blob(['jpeg'], { type: 'image/jpeg' }));

    expect(store.logo()).toBe(canonicalC);
    expect(store.owner()).toEqual({ organizationId: 'organization-c', generation: 3 });
    expect(store.previewUrl()).toBe('blob:logo-1');
  });

  it('never publishes or creates an object URL for stale protected content', () => {
    metadataReads[0].subject.next(presentLogo());
    switchTenant('organization-b', 2);
    metadataReads[1].subject.next(absentLogo());

    contentReads[0].subject.next(new Blob(['late-a'], { type: 'image/png' }));

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(store.state()).toBe('ABSENT');
    expect(store.owner()).toEqual({ organizationId: 'organization-b', generation: 2 });
  });

  it('revokes the previous URL exactly once when a canonical replacement becomes current', () => {
    loadPresent();
    store.selectFile(pngFile());
    store.uploadSelected();
    expect(api.upload).toHaveBeenCalledWith('organization-a', expect.any(File), {
      expectedUpdatedAt: 'v1',
    });

    uploads[0].subject.next(presentLogo({ updatedAt: 'v2' }));
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:logo-1');
    contentReads[1].subject.next(new Blob(['new'], { type: 'image/png' }));

    expect(store.previewUrl()).toBe('blob:logo-2');
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(store.successMessage()).toContain('se actualiz\u00f3');
  });

  it('removes a PRESENT logo with its canonical timestamp and clears runtime state', () => {
    loadPresent();
    store.selectFile(pngFile());
    store.remove();
    expect(api.remove).toHaveBeenCalledWith('organization-a', 'v1');

    removals[0].subject.next(absentLogo());

    expect(store.state()).toBe('ABSENT');
    expect(store.logo()?.rowState).toBe('ABSENT');
    expect(store.previewUrl()).toBeNull();
    expect(store.selectedFile()).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:logo-1');
  });

  it('revokes and clears all logo state on logout without starting another content load', () => {
    loadPresent();
    store.selectFile(pngFile());
    store.errorMessage.set('error');
    store.successMessage.set('success');

    organizationId.set(null);
    generation.set(2);
    invalidations.next({ reason: 'logout', generation: 2 });
    flushEffects();

    expect(store.state()).toBe('NOT_LOADED');
    expect(store.logo()).toBeNull();
    expect(store.previewUrl()).toBeNull();
    expect(store.selectedFile()).toBeNull();
    expect(store.errorMessage()).toBe('');
    expect(store.successMessage()).toBe('');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:logo-1');
    expect(api.getContent).toHaveBeenCalledTimes(1);
  });

  it('uses only expectedRowState for a first upload', () => {
    metadataReads[0].subject.next(absentLogo());
    store.selectFile(pngFile());
    store.uploadSelected();

    expect(api.upload).toHaveBeenCalledWith('organization-a', expect.any(File), {
      expectedRowState: 'ABSENT',
    });
    expect(api.upload.mock.calls[0][2]).not.toHaveProperty('expectedUpdatedAt');
  });

  it('uses only expectedUpdatedAt for a replacement', () => {
    loadPresent();
    store.selectFile(pngFile());
    store.uploadSelected();

    expect(api.upload).toHaveBeenCalledWith('organization-a', expect.any(File), {
      expectedUpdatedAt: 'v1',
    });
    expect(api.upload.mock.calls[0][2]).not.toHaveProperty('expectedRowState');
  });

  it('ignores late A mutation success and error after switching to B', () => {
    metadataReads[0].subject.next(absentLogo());
    store.selectFile(pngFile());
    store.uploadSelected();
    switchTenant('organization-b', 2);
    metadataReads[1].subject.next(absentLogo());

    uploads[0].subject.next(presentLogo({ updatedAt: 'late-a' }));
    uploads[0].subject.error(new HttpErrorResponse({ status: 409 }));

    expect(store.state()).toBe('ABSENT');
    expect(store.owner()).toEqual({ organizationId: 'organization-b', generation: 2 });
    expect(store.successMessage()).toBe('');
    expect(store.errorMessage()).toBe('');
    expect(api.getMetadata).toHaveBeenCalledTimes(2);
  });

  it('ignores a late A delete success and error after switching to B', () => {
    loadPresent();
    store.remove();
    switchTenant('organization-b', 2);
    metadataReads[1].subject.next(absentLogo());

    removals[0].subject.next(absentLogo());
    removals[0].subject.error(new HttpErrorResponse({ status: 409 }));

    expect(store.state()).toBe('ABSENT');
    expect(store.owner()).toEqual({ organizationId: 'organization-b', generation: 2 });
    expect(store.successMessage()).toBe('');
    expect(store.conflictMessage()).toBe('');
    expect(api.getMetadata).toHaveBeenCalledTimes(2);
  });

  it('reconciles one 409 GET, reloads PRESENT content, and never retries the mutation', () => {
    metadataReads[0].subject.next(absentLogo());
    store.selectFile(pngFile());
    store.uploadSelected();
    uploads[0].subject.error(new HttpErrorResponse({ status: 409 }));

    expect(api.upload).toHaveBeenCalledTimes(1);
    expect(api.getMetadata).toHaveBeenCalledTimes(2);
    expect(store.selectedFile()).toBeNull();
    expect(store.state()).toBe('LOADING');

    const canonical = presentLogo({ updatedAt: 'v2', width: 512, height: 256 });
    metadataReads[1].subject.next(canonical);
    contentReads[0].subject.next(new Blob(['canonical'], { type: 'image/png' }));

    expect(store.logo()).toBe(canonical);
    expect(store.state()).toBe('PRESENT');
    expect(store.conflictMessage()).toContain('Otra sesi\u00f3n cambi\u00f3 el logotipo');
    expect(store.successMessage()).toBe('');
    expect(api.upload).toHaveBeenCalledTimes(1);
  });

  it('enters a recoverable ERROR state when the 409 canonical reload fails', () => {
    metadataReads[0].subject.next(absentLogo());
    store.selectFile(pngFile());
    store.uploadSelected();
    uploads[0].subject.error(new HttpErrorResponse({ status: 409 }));
    metadataReads[1].subject.error(new HttpErrorResponse({ status: 503 }));

    expect(store.state()).toBe('ERROR');
    expect(store.errorMessage()).toContain('no fue posible cargar la versi\u00f3n actual');
    expect(store.successMessage()).toBe('');
    expect(store.conflictMessage()).toBe('');
    store.uploadSelected();
    expect(api.upload).toHaveBeenCalledTimes(1);
  });

  it('reconciles a delete 409 once without retrying the DELETE', () => {
    loadPresent();
    store.remove();
    removals[0].subject.error(new HttpErrorResponse({ status: 409 }));

    expect(api.remove).toHaveBeenCalledTimes(1);
    expect(api.getMetadata).toHaveBeenCalledTimes(2);
    metadataReads[1].subject.next(absentLogo());

    expect(store.state()).toBe('ABSENT');
    expect(store.conflictMessage()).toContain('Otra sesi\u00f3n cambi\u00f3 el logotipo');
    expect(api.remove).toHaveBeenCalledTimes(1);
  });

  it.each([
    [400, 'PNG o JPEG v\u00e1lido'],
    [413, '1 MiB'],
  ])('maps backend mutation status %i to safe logo feedback', (status, expectedMessage) => {
    metadataReads[0].subject.next(absentLogo());
    store.selectFile(pngFile());
    store.uploadSelected();
    uploads[0].subject.error(new HttpErrorResponse({ status }));

    expect(store.state()).toBe('ABSENT');
    expect(store.errorMessage()).toContain(expectedMessage);
    expect(store.selectedFile()?.name).toBe('logo.png');
  });

  it('rejects obvious local size, MIME, and extension errors as UX checks', () => {
    metadataReads[0].subject.next(absentLogo());

    store.selectFile(new File([new Uint8Array(1_048_577)], 'large.png', { type: 'image/png' }));
    expect(store.fileError()).toContain('1 MiB');
    store.selectFile(new File(['gif'], 'logo.gif', { type: 'image/gif' }));
    expect(store.fileError()).toContain('PNG o JPEG');
    store.selectFile(new File(['png'], 'logo.txt', { type: 'image/png' }));
    expect(store.fileError()).toContain('.png');
    expect(store.selectedFile()).toBeNull();
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('fails safe when protected Blob type differs from canonical metadata', () => {
    metadataReads[0].subject.next(presentLogo({ mimeType: 'image/png' }));
    contentReads[0].subject.next(new Blob(['jpeg'], { type: 'image/jpeg' }));

    expect(store.state()).toBe('ERROR');
    expect(store.previewUrl()).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  function loadPresent(): void {
    metadataReads[0].subject.next(presentLogo());
    contentReads[0].subject.next(new Blob(['png'], { type: 'image/png' }));
  }

  function switchTenant(nextOrganizationId: string, nextGeneration: number): void {
    organizationId.set(nextOrganizationId);
    generation.set(nextGeneration);
    flushEffects();
  }

  function flushEffects(): void {
    TestBed.inject(ApplicationRef).tick();
  }
});

interface ControlledRequest<T> {
  readonly organizationId: string;
  readonly subject: Subject<T>;
}

function controlled<T>(requests: ControlledRequest<T>[], organizationId: string): Subject<T> {
  const subject = new Subject<T>();
  requests.push({ organizationId, subject });
  return subject;
}

function absentLogo(): OrganizationLogoResponse {
  return {
    rowState: 'ABSENT',
    updatedAt: null,
    mimeType: null,
    byteSize: null,
    width: null,
    height: null,
  };
}

function presentLogo(
  overrides: Partial<Extract<OrganizationLogoResponse, { rowState: 'PRESENT' }>> = {},
): Extract<OrganizationLogoResponse, { rowState: 'PRESENT' }> {
  return {
    rowState: 'PRESENT',
    updatedAt: 'v1',
    mimeType: 'image/png',
    byteSize: 3,
    width: 64,
    height: 64,
    ...overrides,
  };
}

function pngFile(): File {
  return new File(['png'], 'logo.png', { type: 'image/png' });
}

function restoreUrlMethod(
  name: 'createObjectURL' | 'revokeObjectURL',
  original: typeof URL.createObjectURL | typeof URL.revokeObjectURL | undefined,
): void {
  if (original) {
    Object.defineProperty(URL, name, { configurable: true, value: original });
  } else {
    Reflect.deleteProperty(URL, name);
  }
}
