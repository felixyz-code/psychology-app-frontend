import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { OrganizationConfigurationService } from '../../features/organization-administration/services/organization-configuration.service';
import {
  OrganizationBrandingResponse,
  OrganizationBrandingUpdateRequest,
  OrganizationSettingsResponse,
  OrganizationSettingsUpdateRequest,
} from '../../features/organization-administration/models/organization-configuration.models';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import {
  canonicalOrganizationBrandColor,
  PLATFORM_ORGANIZATION_BRAND_ACCENT,
} from './organization-brand-color';

export type ConfigurationLoadState = 'NOT_LOADED' | 'LOADING' | 'LOADED' | 'ERROR';

export interface ConfigurationCanonicalScope {
  readonly organizationId: string;
  readonly generation: number;
}

@Injectable({ providedIn: 'root' })
export class OrganizationConfigurationStore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(OrganizationConfigurationService);
  private readonly tenant = inject(TenantContextStore);
  private requestVersion = 0;

  readonly settings = signal<OrganizationSettingsResponse | null>(null);
  readonly branding = signal<OrganizationBrandingResponse | null>(null);
  readonly settingsOwner = signal<ConfigurationCanonicalScope | null>(null);
  readonly brandingOwner = signal<ConfigurationCanonicalScope | null>(null);
  readonly settingsState = signal<ConfigurationLoadState>('NOT_LOADED');
  readonly brandingState = signal<ConfigurationLoadState>('NOT_LOADED');
  readonly settingsError = signal('');
  readonly brandingError = signal('');
  readonly settingsSaving = signal(false);
  readonly brandingSaving = signal(false);
  readonly settingsSuccess = signal('');
  readonly brandingSuccess = signal('');

  constructor() {
    effect(() => {
      const organizationId = this.tenant.selectedOrganizationId();
      const generation = this.tenant.switchGeneration();
      this.reset();
      if (organizationId) this.load(organizationId, generation);
    });
    this.tenant.invalidations
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reset());
  }

  effectiveAppointmentDuration(): number {
    return this.settings()?.defaultAppointmentDuration ?? 60;
  }

  loadCurrent(): void {
    const organizationId = this.tenant.selectedOrganizationId();
    if (organizationId) this.load(organizationId, this.tenant.switchGeneration());
  }

  saveSettings(value: number | null): void {
    const scope = this.scope();
    const canonical = this.settings();
    if (
      !scope ||
      !canonical ||
      this.settingsState() !== 'LOADED' ||
      !this.ownedBy(this.settingsOwner(), scope) ||
      this.settingsSaving()
    )
      return;
    if (canonical.persistedDefaultAppointmentDuration === value) return;
    this.settingsSaving.set(true);
    this.settingsError.set('');
    this.settingsSuccess.set('');
    this.api
      .updateSettings(scope.organizationId, this.settingsRequest(canonical, value))
      .subscribe({
        next: (response) => {
          if (this.current(scope)) {
            this.applySettings(response, scope);
            this.settingsSuccess.set('La duración predeterminada se actualizó.');
            this.settingsSaving.set(false);
          }
        },
        error: (error) => this.handleSettingsError(scope, error),
      });
  }

  saveBranding(
    input:
      | string
      | null
      | {
          visualName?: string | null;
          primaryColor: string | null;
          accentColor?: string | null;
        },
  ): void {
    const scope = this.scope();
    const canonical = this.branding();
    if (
      !scope ||
      !canonical ||
      this.brandingState() !== 'LOADED' ||
      !this.ownedBy(this.brandingOwner(), scope) ||
      this.brandingSaving()
    )
      return;

    const data =
      typeof input === 'string' || input === null
        ? {
            visualName: canonical.visualName,
            primaryColor: input,
            accentColor: canonical.accentColor,
          }
        : {
            visualName:
              input.visualName !== undefined ? input.visualName : canonical.visualName,
            primaryColor: input.primaryColor,
            accentColor:
              input.accentColor !== undefined ? input.accentColor : canonical.accentColor,
          };

    const normalizedPrimary =
      data.primaryColor === null ? null : canonicalOrganizationBrandColor(data.primaryColor);
    if (data.primaryColor !== null && !normalizedPrimary) {
      this.brandingError.set('Usa un color primario hexadecimal #RRGGBB con contraste suficiente.');
      return;
    }

    const normalizedAccent =
      data.accentColor === null || data.accentColor === undefined
        ? null
        : canonicalOrganizationBrandColor(data.accentColor);
    if (data.accentColor !== null && data.accentColor !== undefined && !normalizedAccent) {
      this.brandingError.set('Usa un color de acento hexadecimal #RRGGBB con contraste suficiente.');
      return;
    }

    const normalizedVisualName =
      data.visualName && data.visualName.trim().length > 0
        ? data.visualName.trim()
        : null;

    if (
      canonical.primaryColor === normalizedPrimary &&
      canonical.accentColor === normalizedAccent &&
      canonical.visualName === normalizedVisualName
    ) {
      return;
    }

    this.brandingSaving.set(true);
    this.brandingError.set('');
    this.brandingSuccess.set('');
    this.api
      .updateBranding(
        scope.organizationId,
        this.brandingRequest(canonical, {
          visualName: normalizedVisualName,
          primaryColor: normalizedPrimary,
          accentColor: normalizedAccent,
        }),
      )
      .subscribe({
        next: (response) => {
          if (this.current(scope)) {
            this.applyBranding(response, scope);
            this.brandingSuccess.set('La identidad visual de la organización se actualizó.');
            this.brandingSaving.set(false);
          }
        },
        error: (error) => this.handleBrandingError(scope, error),
      });
  }

  private load(organizationId: string, generation: number): void {
    const version = ++this.requestVersion;
    const scope = { organizationId, generation, version };
    this.settingsState.set('LOADING');
    this.brandingState.set('LOADING');
    this.settingsError.set('');
    this.brandingError.set('');
    this.settingsSuccess.set('');
    this.brandingSuccess.set('');
    this.api.getSettings(organizationId).subscribe({
      next: (response) => {
        if (this.current(scope)) {
          this.applySettings(response, scope);
          this.settingsState.set('LOADED');
        }
      },
      error: () => {
        if (this.current(scope)) {
          this.settingsState.set('ERROR');
          this.settingsError.set('No fue posible cargar los ajustes.');
        }
      },
    });
    this.api.getBranding(organizationId).subscribe({
      next: (response) => {
        if (this.current(scope)) {
          this.applyBranding(response, scope);
          this.brandingState.set('LOADED');
        }
      },
      error: () => {
        if (this.current(scope)) {
          this.brandingState.set('ERROR');
          this.brandingError.set('No fue posible cargar la identidad visual.');
        }
      },
    });
  }

  private handleSettingsError(scope: Scope, error: HttpErrorResponse): void {
    if (!this.current(scope)) return;
    this.settingsSaving.set(false);
    if (error.status === 409) {
      this.settingsState.set('LOADING');
      this.settingsError.set(
        'La configuración cambió en otra sesión. Cargando la versión más reciente…',
      );
      this.reloadSettings(scope);
      return;
    }
    this.settingsError.set(
      error.status === 400
        ? 'El servidor rechazó el valor. Revisa la duración.'
        : 'No fue posible guardar los ajustes.',
    );
  }
  private handleBrandingError(scope: Scope, error: HttpErrorResponse): void {
    if (!this.current(scope)) return;
    this.brandingSaving.set(false);
    if (error.status === 409) {
      this.brandingState.set('LOADING');
      this.brandingError.set(
        'La configuración cambió en otra sesión. Cargando la versión más reciente…',
      );
      this.reloadBranding(scope);
      return;
    }
    this.brandingError.set(
      error.status === 400
        ? 'El servidor rechazó el color. Revisa el formato.'
        : 'No fue posible guardar la identidad visual.',
    );
  }
  private reloadSettings(scope: Scope): void {
    this.api.getSettings(scope.organizationId).subscribe({
      next: (value) => {
        if (this.current(scope)) {
          this.applySettings(value, scope);
          this.settingsState.set('LOADED');
          this.settingsError.set(
            'La configuración cambió en otra sesión. Se cargó la versión más reciente; revísala antes de volver a guardar.',
          );
        }
      },
      error: () => {
        if (this.current(scope)) {
          this.settingsState.set('ERROR');
          this.settingsError.set(
            'La configuración cambió, pero no fue posible cargar la versión más reciente. Reintenta antes de guardar.',
          );
        }
      },
    });
  }
  private reloadBranding(scope: Scope): void {
    this.api.getBranding(scope.organizationId).subscribe({
      next: (value) => {
        if (this.current(scope)) {
          this.applyBranding(value, scope);
          this.brandingState.set('LOADED');
          this.brandingError.set(
            'La configuración cambió en otra sesión. Se cargó la versión más reciente; revísala antes de volver a guardar.',
          );
        }
      },
      error: () => {
        if (this.current(scope)) {
          this.brandingState.set('ERROR');
          this.brandingError.set(
            'La configuración cambió, pero no fue posible cargar la versión más reciente. Reintenta antes de guardar.',
          );
        }
      },
    });
  }
  private applySettings(value: OrganizationSettingsResponse, scope: Scope): void {
    this.settings.set(value);
    this.settingsOwner.set(this.canonicalScope(scope));
  }
  private applyBranding(value: OrganizationBrandingResponse, scope: Scope): void {
    this.branding.set(value);
    this.brandingOwner.set(this.canonicalScope(scope));
    this.applyAccent(value.primaryColor, value.accentColor);
  }
  private applyAccent(primaryColor: string | null, accentColor?: string | null): void {
    const safePrimary = canonicalOrganizationBrandColor(primaryColor);
    const safeAccent = canonicalOrganizationBrandColor(accentColor ?? null);
    document.documentElement.style.setProperty(
      '--app-org-brand-primary',
      safePrimary ?? PLATFORM_ORGANIZATION_BRAND_ACCENT,
    );
    document.documentElement.style.setProperty(
      '--app-org-brand-accent',
      safeAccent ?? safePrimary ?? PLATFORM_ORGANIZATION_BRAND_ACCENT,
    );
  }
  private reset(): void {
    ++this.requestVersion;
    this.settings.set(null);
    this.branding.set(null);
    this.settingsOwner.set(null);
    this.brandingOwner.set(null);
    this.settingsState.set('NOT_LOADED');
    this.brandingState.set('NOT_LOADED');
    this.settingsError.set('');
    this.brandingError.set('');
    this.settingsSaving.set(false);
    this.brandingSaving.set(false);
    this.settingsSuccess.set('');
    this.brandingSuccess.set('');
    this.applyAccent(null, null);
  }
  private scope(): Scope | null {
    const organizationId = this.tenant.selectedOrganizationId();
    return organizationId
      ? { organizationId, generation: this.tenant.switchGeneration(), version: this.requestVersion }
      : null;
  }
  private current(scope: Scope): boolean {
    return (
      scope.version === this.requestVersion &&
      scope.organizationId === this.tenant.selectedOrganizationId() &&
      scope.generation === this.tenant.switchGeneration()
    );
  }
  private canonicalScope(scope: Scope): ConfigurationCanonicalScope {
    return { organizationId: scope.organizationId, generation: scope.generation };
  }
  private ownedBy(owner: ConfigurationCanonicalScope | null, scope: Scope): boolean {
    return owner?.organizationId === scope.organizationId && owner.generation === scope.generation;
  }
  private settingsRequest(
    c: OrganizationSettingsResponse,
    value: number | null,
  ): OrganizationSettingsUpdateRequest {
    return c.rowState === 'ABSENT'
      ? { defaultAppointmentDuration: value, expectedRowState: 'ABSENT' }
      : { defaultAppointmentDuration: value, expectedUpdatedAt: c.updatedAt! };
  }
  private brandingRequest(
    c: OrganizationBrandingResponse,
    branding: {
      visualName?: string | null;
      primaryColor: string | null;
      accentColor?: string | null;
    },
  ): OrganizationBrandingUpdateRequest {
    const payload = {
      visualName: branding.visualName ?? null,
      primaryColor: branding.primaryColor,
      accentColor: branding.accentColor ?? null,
    };
    return c.rowState === 'ABSENT'
      ? { ...payload, expectedRowState: 'ABSENT' }
      : { ...payload, expectedUpdatedAt: c.updatedAt! };
  }
}

interface Scope {
  organizationId: string;
  generation: number;
  version: number;
}
