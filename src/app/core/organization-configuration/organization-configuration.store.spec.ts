import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import {
  OrganizationBrandingResponse,
  OrganizationSettingsResponse,
} from '../../features/organization-administration/models/organization-configuration.models';
import { OrganizationConfigurationService } from '../../features/organization-administration/services/organization-configuration.service';
import {
  TenantContextStore,
  TenantStateInvalidation,
} from '../tenant-context/tenant-context.store';
import { PLATFORM_ORGANIZATION_BRAND_ACCENT } from './organization-brand-color';
import { OrganizationConfigurationStore } from './organization-configuration.store';

describe('OrganizationConfigurationStore', () => {
  let store: OrganizationConfigurationStore;
  let organizationId: ReturnType<typeof signal<string | null>>;
  let generation: ReturnType<typeof signal<number>>;
  let invalidations: Subject<TenantStateInvalidation>;
  let settingsReads: ControlledRequest<OrganizationSettingsResponse>[];
  let brandingReads: ControlledRequest<OrganizationBrandingResponse>[];
  let settingsUpdates: ControlledRequest<OrganizationSettingsResponse>[];
  let brandingUpdates: ControlledRequest<OrganizationBrandingResponse>[];
  let api: {
    getSettings: ReturnType<typeof vi.fn>;
    getBranding: ReturnType<typeof vi.fn>;
    updateSettings: ReturnType<typeof vi.fn>;
    updateBranding: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    organizationId = signal<string | null>('organization-a');
    generation = signal(1);
    invalidations = new Subject<TenantStateInvalidation>();
    settingsReads = [];
    brandingReads = [];
    settingsUpdates = [];
    brandingUpdates = [];
    api = {
      getSettings: vi.fn((requestedOrganizationId: string) =>
        controlled(settingsReads, requestedOrganizationId),
      ),
      getBranding: vi.fn((requestedOrganizationId: string) =>
        controlled(brandingReads, requestedOrganizationId),
      ),
      updateSettings: vi.fn((requestedOrganizationId: string) =>
        controlled(settingsUpdates, requestedOrganizationId),
      ),
      updateBranding: vi.fn((requestedOrganizationId: string) =>
        controlled(brandingUpdates, requestedOrganizationId),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationConfigurationStore,
        { provide: OrganizationConfigurationService, useValue: api },
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
    store = TestBed.inject(OrganizationConfigurationStore);
    flushEffects();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.documentElement.style.removeProperty('--app-org-brand-accent');
    document.documentElement.style.removeProperty('--app-color-primary');
    localStorage.clear();
  });

  it('derives the effective duration for ABSENT, persisted null, and configured settings', () => {
    settingsReads[0].subject.next(settings({ rowState: 'ABSENT' }));
    expect(store.settings()?.persistedDefaultAppointmentDuration).toBeNull();
    expect(store.effectiveAppointmentDuration()).toBe(60);

    switchTenant('organization-b', 2);
    settingsReads[1].subject.next(
      settings({ rowState: 'PRESENT', updatedAt: 'b', persistedDefaultAppointmentDuration: null }),
    );
    expect(store.effectiveAppointmentDuration()).toBe(60);

    switchTenant('organization-c', 3);
    settingsReads[2].subject.next(
      settings({
        rowState: 'PRESENT',
        updatedAt: 'c',
        defaultAppointmentDuration: 45,
        persistedDefaultAppointmentDuration: 45,
      }),
    );
    expect(store.effectiveAppointmentDuration()).toBe(45);
  });

  it('sends only the certified ABSENT or PRESENT settings precondition', () => {
    completeInitial(settings({ rowState: 'ABSENT' }), branding());
    store.saveSettings(45);
    expect(api.updateSettings).toHaveBeenLastCalledWith('organization-a', {
      defaultAppointmentDuration: 45,
      expectedRowState: 'ABSENT',
    });

    switchTenant('organization-b', 2);
    settingsReads[1].subject.next(
      settings({
        rowState: 'PRESENT',
        updatedAt: 'settings-v2',
        persistedDefaultAppointmentDuration: 45,
        defaultAppointmentDuration: 45,
      }),
    );
    store.saveSettings(60);
    expect(api.updateSettings).toHaveBeenLastCalledWith('organization-b', {
      defaultAppointmentDuration: 60,
      expectedUpdatedAt: 'settings-v2',
    });
  });

  it('sends only the certified ABSENT or PRESENT branding precondition', () => {
    completeInitial(settings(), branding({ rowState: 'ABSENT' }));
    store.saveBranding('#7C3AED');
    expect(api.updateBranding).toHaveBeenLastCalledWith('organization-a', {
      visualName: null,
      primaryColor: '#7C3AED',
      accentColor: null,
      expectedRowState: 'ABSENT',
    });

    switchTenant('organization-b', 2);
    brandingReads[1].subject.next(
      branding({ rowState: 'PRESENT', updatedAt: 'branding-v2', primaryColor: '#7C3AED' }),
    );
    store.saveBranding('#2563EB');
    expect(api.updateBranding).toHaveBeenLastCalledWith('organization-b', {
      visualName: null,
      primaryColor: '#2563EB',
      accentColor: null,
      expectedUpdatedAt: 'branding-v2',
    });
  });

  it('sends null for reset and avoids canonical no-op PATCH requests', () => {
    completeInitial(
      settings({
        rowState: 'PRESENT',
        updatedAt: 'settings-v1',
        defaultAppointmentDuration: 45,
        persistedDefaultAppointmentDuration: 45,
      }),
      branding({ rowState: 'PRESENT', updatedAt: 'branding-v1', primaryColor: '#2563EB' }),
    );

    store.saveSettings(45);
    store.saveBranding('#2563eb');
    expect(api.updateSettings).not.toHaveBeenCalled();
    expect(api.updateBranding).not.toHaveBeenCalled();

    store.saveSettings(null);
    expect(api.updateSettings).toHaveBeenCalledWith('organization-a', {
      defaultAppointmentDuration: null,
      expectedUpdatedAt: 'settings-v1',
    });

    switchTenant('organization-b', 2);
    settingsReads[1].subject.next(
      settings({
        rowState: 'PRESENT',
        updatedAt: 'settings-v2',
        persistedDefaultAppointmentDuration: null,
      }),
    );
    store.saveSettings(null);
    expect(api.updateSettings).toHaveBeenCalledTimes(1);
  });

  it('adopts exact canonical PATCH responses rather than reconstructing local state', () => {
    completeInitial(settings({ rowState: 'ABSENT' }), branding({ rowState: 'ABSENT' }));
    store.saveSettings(45);
    settingsUpdates[0].subject.next(
      settings({
        rowState: 'PRESENT',
        updatedAt: 'server-settings',
        defaultAppointmentDuration: 30,
        persistedDefaultAppointmentDuration: 30,
      }),
    );
    expect(store.settings()?.persistedDefaultAppointmentDuration).toBe(30);

    store.saveBranding('#7C3AED');
    brandingUpdates[0].subject.next(
      branding({ rowState: 'PRESENT', updatedAt: 'server-branding', primaryColor: '#2563EB' }),
    );
    expect(store.branding()?.primaryColor).toBe('#2563EB');
  });

  it('publishes only C for adversarial A to B to C reads and applies fallback immediately', () => {
    switchTenant('organization-b', 2);
    switchTenant('organization-c', 3);
    expect(document.documentElement.style.getPropertyValue('--app-org-brand-accent')).toBe(
      PLATFORM_ORGANIZATION_BRAND_ACCENT,
    );

    settingsReads[1].subject.next(
      settings({ defaultAppointmentDuration: 45, persistedDefaultAppointmentDuration: 45 }),
    );
    brandingReads[1].subject.next(branding({ primaryColor: '#7C3AED' }));
    settingsReads[0].subject.next(
      settings({ defaultAppointmentDuration: 90, persistedDefaultAppointmentDuration: 90 }),
    );
    brandingReads[0].subject.next(branding({ primaryColor: '#2563EB' }));
    expect(store.settings()).toBeNull();
    expect(store.branding()).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--app-org-brand-accent')).toBe(
      PLATFORM_ORGANIZATION_BRAND_ACCENT,
    );

    const settingsC = settings({
      rowState: 'PRESENT',
      updatedAt: 'c',
      defaultAppointmentDuration: 30,
      persistedDefaultAppointmentDuration: 30,
    });
    const brandingC = branding({ rowState: 'PRESENT', updatedAt: 'c', primaryColor: '#7C3AED' });
    settingsReads[2].subject.next(settingsC);
    brandingReads[2].subject.next(brandingC);
    expect(store.settings()).toBe(settingsC);
    expect(store.branding()).toBe(brandingC);
    expect(store.settingsOwner()).toEqual({ organizationId: 'organization-c', generation: 3 });
    expect(store.brandingOwner()).toEqual({ organizationId: 'organization-c', generation: 3 });
  });

  it('ignores late A mutation success after switching to B', () => {
    completeInitial(
      settings({ persistedDefaultAppointmentDuration: 45, defaultAppointmentDuration: 45 }),
      branding(),
    );
    store.saveSettings(90);
    switchTenant('organization-b', 2);
    settingsUpdates[0].subject.next(
      settings({ persistedDefaultAppointmentDuration: 90, defaultAppointmentDuration: 90 }),
    );
    expect(store.settings()).toBeNull();
    expect(store.settingsSuccess()).toBe('');
    expect(store.settingsSaving()).toBe(false);
  });

  it('ignores late A mutation error after switching to B', () => {
    completeInitial(settings(), branding({ primaryColor: '#2563EB' }));
    store.saveBranding('#7C3AED');
    switchTenant('organization-b', 2);
    brandingUpdates[0].subject.error(new HttpErrorResponse({ status: 409 }));
    expect(store.branding()).toBeNull();
    expect(store.brandingError()).toBe('');
    expect(brandingReads).toHaveLength(2);
  });

  it('clears all tenant state and accent on logout invalidation', () => {
    completeInitial(settings(), branding({ primaryColor: '#7C3AED' }));
    store.settingsError.set('error');
    store.brandingError.set('error');
    store.settingsSuccess.set('success');
    store.brandingSuccess.set('success');
    store.settingsSaving.set(true);
    store.brandingSaving.set(true);

    organizationId.set(null);
    generation.set(2);
    invalidations.next({ reason: 'logout', generation: 2 });
    flushEffects();

    expect(store.settings()).toBeNull();
    expect(store.branding()).toBeNull();
    expect(store.settingsError()).toBe('');
    expect(store.brandingError()).toBe('');
    expect(store.settingsSuccess()).toBe('');
    expect(store.brandingSuccess()).toBe('');
    expect(store.settingsSaving()).toBe(false);
    expect(store.brandingSaving()).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--app-org-brand-accent')).toBe(
      PLATFORM_ORGANIZATION_BRAND_ACCENT,
    );
  });

  it('reconciles one settings 409 GET and adopts its exact canonical response', () => {
    completeInitial(
      settings({
        rowState: 'PRESENT',
        updatedAt: 'v1',
        defaultAppointmentDuration: 45,
        persistedDefaultAppointmentDuration: 45,
      }),
      branding(),
    );
    store.saveSettings(90);
    settingsUpdates[0].subject.error(new HttpErrorResponse({ status: 409 }));
    expect(api.updateSettings).toHaveBeenCalledTimes(1);
    expect(api.getSettings).toHaveBeenCalledTimes(2);
    expect(store.settingsState()).toBe('LOADING');

    const canonical = settings({
      rowState: 'PRESENT',
      updatedAt: 'v2',
      defaultAppointmentDuration: 30,
      persistedDefaultAppointmentDuration: 30,
    });
    settingsReads[1].subject.next(canonical);
    expect(store.settings()).toBe(canonical);
    expect(store.settingsState()).toBe('LOADED');
    expect(store.settingsError()).toContain('Se cargó la versión más reciente');
    expect(store.settingsSuccess()).toBe('');
    expect(api.updateSettings).toHaveBeenCalledTimes(1);
  });

  it('turns a failed settings reconciliation into a safe recoverable state', () => {
    completeInitial(settings(), branding());
    store.saveSettings(45);
    settingsUpdates[0].subject.error(new HttpErrorResponse({ status: 409 }));
    settingsReads[1].subject.error(new HttpErrorResponse({ status: 503 }));

    expect(store.settingsState()).toBe('ERROR');
    expect(store.settingsError()).toContain('no fue posible cargar la versión más reciente');
    expect(store.settingsSuccess()).toBe('');
    store.saveSettings(90);
    expect(api.updateSettings).toHaveBeenCalledTimes(1);
  });

  it('reconciles branding conflicts and safely handles reconciliation failure', () => {
    completeInitial(
      settings(),
      branding({ rowState: 'PRESENT', updatedAt: 'v1', primaryColor: '#2563EB' }),
    );
    store.saveBranding('#7C3AED');
    brandingUpdates[0].subject.error(new HttpErrorResponse({ status: 409 }));
    const canonical = branding({ rowState: 'PRESENT', updatedAt: 'v2', primaryColor: '#2563EB' });
    brandingReads[1].subject.next(canonical);
    expect(store.branding()).toBe(canonical);
    expect(store.brandingError()).toContain('Se cargó la versión más reciente');
    expect(api.updateBranding).toHaveBeenCalledTimes(1);

    store.saveBranding('#7C3AED');
    brandingUpdates[1].subject.error(new HttpErrorResponse({ status: 409 }));
    brandingReads[2].subject.error(new HttpErrorResponse({ status: 503 }));
    expect(store.brandingState()).toBe('ERROR');
    expect(store.brandingError()).toContain('no fue posible cargar la versión más reciente');
    expect(store.brandingSuccess()).toBe('');
    expect(api.updateBranding).toHaveBeenCalledTimes(2);
  });

  it('preserves invalid canonical color for diagnostics while isolating theme state', () => {
    localStorage.setItem('psychology-theme', 'dark');
    document.documentElement.style.setProperty('--app-color-primary', '#ABCDEF');
    const unsafe = branding({
      rowState: 'PRESENT',
      updatedAt: 'unsafe',
      primaryColor: 'url(javascript:alert(1))',
    });
    brandingReads[0].subject.next(unsafe);

    expect(store.branding()).toBe(unsafe);
    expect(document.documentElement.style.getPropertyValue('--app-org-brand-accent')).toBe(
      PLATFORM_ORGANIZATION_BRAND_ACCENT,
    );
    expect(document.documentElement.style.getPropertyValue('--app-color-primary')).toBe('#ABCDEF');
    expect(localStorage.getItem('psychology-theme')).toBe('dark');
  });

  function completeInitial(
    settingsResponse: OrganizationSettingsResponse,
    brandingResponse: OrganizationBrandingResponse,
  ): void {
    settingsReads[0].subject.next(settingsResponse);
    brandingReads[0].subject.next(brandingResponse);
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

function settings(
  overrides: Partial<OrganizationSettingsResponse> = {},
): OrganizationSettingsResponse {
  return {
    rowState: 'ABSENT',
    updatedAt: null,
    defaultAppointmentDuration: 60,
    persistedDefaultAppointmentDuration: null,
    ...overrides,
  };
}

function branding(
  overrides: Partial<OrganizationBrandingResponse> = {},
): OrganizationBrandingResponse {
  return {
    rowState: 'ABSENT',
    updatedAt: null,
    visualName: null,
    primaryColor: null,
    accentColor: null,
    ...overrides,
  };
}
