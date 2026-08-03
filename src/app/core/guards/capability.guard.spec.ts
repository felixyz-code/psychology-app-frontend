import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { capabilityGuard } from './capability.guard';
import { TenantContextStore } from '../tenant-context/tenant-context.store';

describe('capabilityGuard', () => {
  let tenantStore: {
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    isAdminSuspendedContext: ReturnType<typeof vi.fn>;
    hasCapability: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    tenantStore = {
      isActiveTenantReady: vi.fn().mockReturnValue(true),
      isAdminSuspendedContext: vi.fn().mockReturnValue(false),
      hasCapability: vi.fn().mockReturnValue(true),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: TenantContextStore, useValue: tenantStore }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('allows a route only when its declared capability is present', () => {
    const result = TestBed.runInInjectionContext(() =>
      capabilityGuard(
        { data: { requiredCapability: 'patient.read' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(true);
    expect(tenantStore.hasCapability).toHaveBeenCalledWith('patient.read');
  });

  it('denies a route without its capability', () => {
    tenantStore.hasCapability.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      capabilityGuard(
        { data: { requiredCapability: 'patient.delete' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(false);
  });

  it('allows suspended administrator capabilities but still relies on the projected catalog', () => {
    tenantStore.isActiveTenantReady.mockReturnValue(false);
    tenantStore.isAdminSuspendedContext.mockReturnValue(true);
    tenantStore.hasCapability.mockImplementation(
      (capability: string) => capability === 'organization.manage',
    );

    const result = TestBed.runInInjectionContext(() =>
      capabilityGuard(
        { data: { requiredCapability: 'organization.manage' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(true);

    const clinicalResult = TestBed.runInInjectionContext(() =>
      capabilityGuard(
        { data: { requiredCapability: 'patient.read' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

    expect(clinicalResult).toBe(false);
  });
});
