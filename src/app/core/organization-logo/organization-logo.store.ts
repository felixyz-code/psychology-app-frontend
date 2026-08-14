import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  OrganizationLogoMimeType,
  OrganizationLogoResponse,
  OrganizationLogoUploadPrecondition,
  PresentOrganizationLogoResponse,
} from '../../features/organization-administration/models/organization-logo.models';
import { OrganizationLogoService } from '../../features/organization-administration/services/organization-logo.service';
import { TenantContextStore } from '../tenant-context/tenant-context.store';

export type OrganizationLogoLoadState = 'NOT_LOADED' | 'LOADING' | 'ABSENT' | 'PRESENT' | 'ERROR';
export type OrganizationLogoMutationState = 'IDLE' | 'UPLOADING' | 'REMOVING';

export interface OrganizationLogoCanonicalScope {
  readonly organizationId: string;
  readonly generation: number;
}

const MAX_LOGO_BYTES = 1_048_576;
const ACCEPTED_MIME_TYPES = new Set<OrganizationLogoMimeType>(['image/png', 'image/jpeg']);
const ACCEPTED_EXTENSION = /\.(?:png|jpe?g)$/i;

@Injectable({ providedIn: 'root' })
export class OrganizationLogoStore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(OrganizationLogoService);
  private readonly tenant = inject(TenantContextStore);
  private requestVersion = 0;

  readonly logo = signal<OrganizationLogoResponse | null>(null);
  readonly owner = signal<OrganizationLogoCanonicalScope | null>(null);
  readonly state = signal<OrganizationLogoLoadState>('NOT_LOADED');
  readonly previewUrl = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal('');
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly conflictMessage = signal('');
  readonly mutationState = signal<OrganizationLogoMutationState>('IDLE');

  constructor() {
    effect(() => {
      const organizationId = this.tenant.selectedOrganizationId();
      const generation = this.tenant.switchGeneration();
      untracked(() => {
        this.reset();
        if (organizationId) this.beginLoad({ organizationId, generation });
      });
    });
    this.tenant.invalidations
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reset());
    this.destroyRef.onDestroy(() => this.reset());
  }

  loadCurrent(): void {
    const scope = this.captureTenantScope();
    if (scope) this.beginLoad(scope);
  }

  selectFile(file: File | null): void {
    this.fileError.set('');
    this.errorMessage.set('');
    this.successMessage.set('');
    this.conflictMessage.set('');

    if (!file) {
      this.selectedFile.set(null);
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      this.selectedFile.set(null);
      this.fileError.set('El archivo supera el m\u00e1ximo permitido de 1 MiB.');
      return;
    }
    if (!ACCEPTED_MIME_TYPES.has(file.type as OrganizationLogoMimeType)) {
      this.selectedFile.set(null);
      this.fileError.set('Selecciona un archivo PNG o JPEG.');
      return;
    }
    if (!ACCEPTED_EXTENSION.test(file.name)) {
      this.selectedFile.set(null);
      this.fileError.set('La extensi\u00f3n debe ser .png, .jpg o .jpeg.');
      return;
    }

    this.selectedFile.set(file);
  }

  uploadSelected(): void {
    const scope = this.captureRequestScope();
    const canonical = this.logo();
    const file = this.selectedFile();
    if (
      !scope ||
      !canonical ||
      !file ||
      this.mutationState() !== 'IDLE' ||
      !this.isCanonicalState(canonical, scope)
    ) {
      return;
    }

    const precondition: OrganizationLogoUploadPrecondition =
      canonical.rowState === 'ABSENT'
        ? { expectedRowState: 'ABSENT' }
        : { expectedUpdatedAt: canonical.updatedAt };
    this.mutationState.set('UPLOADING');
    this.errorMessage.set('');
    this.successMessage.set('');
    this.conflictMessage.set('');

    this.api.upload(scope.organizationId, file, precondition).subscribe({
      next: (response) => {
        if (!this.isCurrent(scope)) return;
        this.mutationState.set('IDLE');
        this.selectedFile.set(null);
        this.fileError.set('');
        if (!isCanonicalLogoResponse(response) || response.rowState !== 'PRESENT') {
          this.enterError('El servidor devolvi\u00f3 una respuesta de logotipo no v\u00e1lida.');
          return;
        }
        this.clearPreview();
        this.applyCanonical(response, scope);
        this.state.set('LOADING');
        this.loadContent(response, scope, {
          successMessage: 'El logotipo de la organizaci\u00f3n se actualiz\u00f3.',
        });
      },
      error: (error: HttpErrorResponse) => this.handleMutationError(scope, error),
    });
  }

  remove(): void {
    const scope = this.captureRequestScope();
    const canonical = this.logo();
    if (
      !scope ||
      !canonical ||
      canonical.rowState !== 'PRESENT' ||
      this.state() !== 'PRESENT' ||
      this.mutationState() !== 'IDLE' ||
      !this.isCanonicalState(canonical, scope)
    ) {
      return;
    }

    this.mutationState.set('REMOVING');
    this.errorMessage.set('');
    this.successMessage.set('');
    this.conflictMessage.set('');
    this.api.remove(scope.organizationId, canonical.updatedAt).subscribe({
      next: (response) => {
        if (!this.isCurrent(scope)) return;
        this.mutationState.set('IDLE');
        if (!isCanonicalLogoResponse(response) || response.rowState !== 'ABSENT') {
          this.enterError('El servidor devolvi\u00f3 una respuesta de logotipo no v\u00e1lida.');
          return;
        }
        this.clearPreview();
        this.selectedFile.set(null);
        this.fileError.set('');
        this.applyCanonical(response, scope);
        this.state.set('ABSENT');
        this.successMessage.set('El logotipo de la organizaci\u00f3n se elimin\u00f3.');
      },
      error: (error: HttpErrorResponse) => this.handleMutationError(scope, error),
    });
  }

  private beginLoad(
    tenantScope: OrganizationLogoCanonicalScope,
    options: { conflict?: boolean } = {},
  ): void {
    const scope: RequestScope = { ...tenantScope, version: ++this.requestVersion };
    this.clearPreview();
    this.logo.set(null);
    this.owner.set(null);
    this.selectedFile.set(null);
    this.fileError.set('');
    this.errorMessage.set('');
    this.successMessage.set('');
    this.conflictMessage.set('');
    this.mutationState.set('IDLE');
    this.state.set('LOADING');

    this.api.getMetadata(scope.organizationId).subscribe({
      next: (response) => {
        if (!this.isCurrent(scope)) return;
        if (!isCanonicalLogoResponse(response)) {
          this.enterLoadError(options.conflict);
          return;
        }
        this.applyCanonical(response, scope);
        if (response.rowState === 'ABSENT') {
          this.state.set('ABSENT');
          if (options.conflict) this.publishConflictMessage();
          return;
        }
        this.loadContent(response, scope, { conflict: options.conflict });
      },
      error: () => {
        if (this.isCurrent(scope)) this.enterLoadError(options.conflict);
      },
    });
  }

  private loadContent(
    canonical: PresentOrganizationLogoResponse,
    scope: RequestScope,
    options: { conflict?: boolean; successMessage?: string } = {},
  ): void {
    this.api.getContent(scope.organizationId).subscribe({
      next: (blob) => {
        if (!this.isCurrent(scope)) return;
        if (!isAcceptedMimeType(blob.type) || blob.type !== canonical.mimeType) {
          this.clearPreview();
          this.enterError(
            options.conflict
              ? 'El logotipo cambi\u00f3 en otra sesi\u00f3n, pero no fue posible cargar la versi\u00f3n actual. Reintenta antes de modificarlo.'
              : 'No fue posible mostrar el logotipo protegido. Reintenta la carga.',
          );
          return;
        }

        let objectUrl: string;
        try {
          objectUrl = URL.createObjectURL(blob);
        } catch {
          this.enterError('No fue posible preparar la vista previa protegida del logotipo.');
          return;
        }
        if (!this.isCurrent(scope)) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        this.replacePreview(objectUrl);
        this.state.set('PRESENT');
        if (options.conflict) this.publishConflictMessage();
        if (options.successMessage) this.successMessage.set(options.successMessage);
      },
      error: () => {
        if (!this.isCurrent(scope)) return;
        this.clearPreview();
        this.enterError(
          options.conflict
            ? 'El logotipo cambi\u00f3 en otra sesi\u00f3n, pero no fue posible cargar la versi\u00f3n actual. Reintenta antes de modificarlo.'
            : 'No fue posible cargar el contenido protegido del logotipo.',
        );
      },
    });
  }

  private handleMutationError(scope: RequestScope, error: HttpErrorResponse): void {
    if (!this.isCurrent(scope)) return;
    this.mutationState.set('IDLE');
    this.successMessage.set('');
    if (error.status === 409) {
      this.beginLoad(
        { organizationId: scope.organizationId, generation: scope.generation },
        { conflict: true },
      );
      return;
    }
    this.errorMessage.set(mutationErrorMessage(error));
  }

  private enterLoadError(conflict = false): void {
    this.enterError(
      conflict
        ? 'El logotipo cambi\u00f3 en otra sesi\u00f3n, pero no fue posible cargar la versi\u00f3n actual. Reintenta antes de modificarlo.'
        : 'No fue posible cargar la informaci\u00f3n del logotipo.',
    );
  }

  private enterError(message: string): void {
    this.state.set('ERROR');
    this.errorMessage.set(message);
    this.successMessage.set('');
    this.conflictMessage.set('');
    this.mutationState.set('IDLE');
  }

  private publishConflictMessage(): void {
    this.conflictMessage.set(
      'Otra sesi\u00f3n cambi\u00f3 el logotipo. Se carg\u00f3 la versi\u00f3n actual; rev\u00edsala antes de realizar otra acci\u00f3n.',
    );
  }

  private applyCanonical(response: OrganizationLogoResponse, scope: RequestScope): void {
    this.logo.set(response);
    this.owner.set({ organizationId: scope.organizationId, generation: scope.generation });
  }

  private replacePreview(objectUrl: string): void {
    this.clearPreview();
    this.previewUrl.set(objectUrl);
  }

  private clearPreview(): void {
    const current = this.previewUrl();
    if (current) URL.revokeObjectURL(current);
    this.previewUrl.set(null);
  }

  private reset(): void {
    ++this.requestVersion;
    this.clearPreview();
    this.logo.set(null);
    this.owner.set(null);
    this.state.set('NOT_LOADED');
    this.selectedFile.set(null);
    this.fileError.set('');
    this.errorMessage.set('');
    this.successMessage.set('');
    this.conflictMessage.set('');
    this.mutationState.set('IDLE');
  }

  private captureTenantScope(): OrganizationLogoCanonicalScope | null {
    const organizationId = this.tenant.selectedOrganizationId();
    return organizationId ? { organizationId, generation: this.tenant.switchGeneration() } : null;
  }

  private captureRequestScope(): RequestScope | null {
    const tenantScope = this.captureTenantScope();
    return tenantScope ? { ...tenantScope, version: this.requestVersion } : null;
  }

  private isCurrent(scope: RequestScope): boolean {
    return (
      scope.version === this.requestVersion &&
      scope.organizationId === this.tenant.selectedOrganizationId() &&
      scope.generation === this.tenant.switchGeneration()
    );
  }

  private isCanonicalState(canonical: OrganizationLogoResponse, scope: RequestScope): boolean {
    const owner = this.owner();
    return (
      this.logo() === canonical &&
      (this.state() === 'ABSENT' || this.state() === 'PRESENT') &&
      owner?.organizationId === scope.organizationId &&
      owner.generation === scope.generation
    );
  }
}

interface RequestScope extends OrganizationLogoCanonicalScope {
  readonly version: number;
}

function isAcceptedMimeType(value: string): value is OrganizationLogoMimeType {
  return ACCEPTED_MIME_TYPES.has(value as OrganizationLogoMimeType);
}

function isCanonicalLogoResponse(value: unknown): value is OrganizationLogoResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<OrganizationLogoResponse>;
  if (candidate.rowState === 'ABSENT') {
    return (
      candidate.updatedAt === null &&
      candidate.mimeType === null &&
      candidate.byteSize === null &&
      candidate.width === null &&
      candidate.height === null
    );
  }
  return (
    candidate.rowState === 'PRESENT' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.mimeType === 'string' &&
    isAcceptedMimeType(candidate.mimeType) &&
    typeof candidate.byteSize === 'number' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number'
  );
}

function mutationErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 400) {
    return 'No fue posible aceptar el logotipo. Usa un PNG o JPEG v\u00e1lido dentro de los l\u00edmites permitidos.';
  }
  if (error.status === 413) {
    return 'El archivo supera el m\u00e1ximo permitido de 1 MiB.';
  }
  if (error.status === 403) {
    return 'El servidor rechaz\u00f3 esta acci\u00f3n. Tus permisos pudieron haber cambiado.';
  }
  if (error.status === 404) {
    return 'La organizaci\u00f3n o su logotipo ya no est\u00e1n disponibles en este contexto.';
  }
  return 'No fue posible actualizar el logotipo. Revisa tu conexi\u00f3n e intenta nuevamente.';
}
