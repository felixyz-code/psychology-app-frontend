import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { activeTenantGuard, tenantContextGuard } from './tenant-context.guard';
import { TenantContextStore } from '../tenant-context/tenant-context.store';

describe('tenantContextGuard', () => {
  let router: Router;
  let tenantStore: {
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    isAdminSuspendedContext: ReturnType<typeof vi.fn>;
    state: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    tenantStore = {
      isActiveTenantReady: vi.fn().mockReturnValue(false),
      isAdminSuspendedContext: vi.fn().mockReturnValue(false),
      state: vi.fn().mockReturnValue('AMBIGUOUS_SELECTION'),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TenantContextStore, useValue: tenantStore }],
    });
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('allows only a confirmed active tenant context', () => {
    tenantStore.isActiveTenantReady.mockReturnValue(true);

    expect(runGuard()).toBe(true);
  });

  it('allows the administrative shell for a suspended administrator context', () => {
    tenantStore.state.mockReturnValue('ADMIN_SUSPENDED_CONTEXT');
    tenantStore.isAdminSuspendedContext.mockReturnValue(true);

    expect(runGuard()).toBe(true);
  });

  it('returns to login after context access is lost', () => {
    tenantStore.state.mockReturnValue('FORBIDDEN');

    const result = runGuard();

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('routes ambiguous tenant states to organization selection', () => {
    const result = runGuard();

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/organization-selection');
  });

  it('routes users without an active organization to organization selection', () => {
    tenantStore.state.mockReturnValue('NO_ACTIVE_TENANT');

    const result = runGuard();

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/organization-selection');
  });

  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () =>
        tenantContextGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as
          | boolean
          | UrlTree,
    );
  }
});

describe('activeTenantGuard', () => {
  it('redirects suspended administrative context away from operational routes', () => {
    const store = {
      isActiveTenantReady: vi.fn().mockReturnValue(false),
      isAdminSuspendedContext: vi.fn().mockReturnValue(true),
      isCanonicalContextSynchronizationPending: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TenantContextStore, useValue: store }],
    });

    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(
      () => activeTenantGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as UrlTree,
    );

    expect(router.serializeUrl(result)).toBe('/organization-administration');
    TestBed.resetTestingModule();
  });

  it('blocks operational routes while canonical lifecycle reconciliation is pending', () => {
    const store = {
      isActiveTenantReady: vi.fn().mockReturnValue(true),
      isAdminSuspendedContext: vi.fn().mockReturnValue(false),
      isCanonicalContextSynchronizationPending: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TenantContextStore, useValue: store }],
    });

    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(
      () => activeTenantGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as UrlTree,
    );

    expect(router.serializeUrl(result)).toBe('/organization-administration');
    TestBed.resetTestingModule();
  });
});
