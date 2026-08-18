import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { capabilityGuard } from './capability.guard';
import { TenantContextStore } from '../tenant-context/tenant-context.store';

describe('capabilityGuard', () => {
  let router: Router;
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
      providers: [provideRouter([]), { provide: TenantContextStore, useValue: tenantStore }],
    });
    router = TestBed.inject(Router);
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

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('fails closed when the route does not declare a capability', () => {
    const result = TestBed.runInInjectionContext(() =>
      capabilityGuard({ data: {} } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    expect(result).toBe(false);
    expect(tenantStore.hasCapability).not.toHaveBeenCalled();
  });

  it('fails closed while tenant context is not ready', () => {
    tenantStore.isActiveTenantReady.mockReturnValue(false);
    tenantStore.hasCapability.mockReturnValue(false);
    const createUrlTree = vi.spyOn(router, 'createUrlTree');

    const result = TestBed.runInInjectionContext(() =>
      capabilityGuard(
        { data: { requiredCapability: 'patient.read' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(false);
    expect(createUrlTree).not.toHaveBeenCalled();
    expect(tenantStore.hasCapability).not.toHaveBeenCalled();
  });

  it('allows suspended administrator capabilities but still relies on the projected catalog', () => {
    tenantStore.isActiveTenantReady.mockReturnValue(false);
    tenantStore.isAdminSuspendedContext.mockReturnValue(true);
    tenantStore.hasCapability.mockImplementation(
      (capability: string) => capability === 'organization.manage',
    );

    const result = TestBed.runInInjectionContext(() =>
      capabilityGuard(
        {
          data: { requiredCapability: 'organization.manage' },
        } as unknown as ActivatedRouteSnapshot,
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

  it('denies membership administration in suspended context when membership.read is absent', () => {
    tenantStore.isActiveTenantReady.mockReturnValue(false);
    tenantStore.isAdminSuspendedContext.mockReturnValue(true);
    tenantStore.hasCapability.mockReturnValue(false);
    const createUrlTree = vi.spyOn(router, 'createUrlTree');

    const result = TestBed.runInInjectionContext(() =>
      capabilityGuard(
        { data: { requiredCapability: 'membership.read' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(false);
    expect(createUrlTree).not.toHaveBeenCalled();
  });
});
