import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

import { AuthStore } from '../auth/auth.store';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { anonymousOnlyGuard } from './anonymous-only.guard';

describe('anonymousOnlyGuard', () => {
  let authStore: { isAuthenticated: ReturnType<typeof vi.fn> };
  let tenantContextStore: {
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    isAdminSuspendedContext: ReturnType<typeof vi.fn>;
  };
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authStore = { isAuthenticated: vi.fn(() => false) };
    tenantContextStore = {
      isActiveTenantReady: vi.fn(() => false),
      isAdminSuspendedContext: vi.fn(() => false),
    };
    router = { createUrlTree: vi.fn((commands: string[]) => commands) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: authStore },
        { provide: TenantContextStore, useValue: tenantContextStore },
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('allows anonymous signup', () => {
    expect(runGuard()).toBe(true);
  });

  it('routes an authenticated active tenant to the dashboard', () => {
    authStore.isAuthenticated.mockReturnValue(true);
    tenantContextStore.isActiveTenantReady.mockReturnValue(true);

    expect(runGuard()).toEqual(['/dashboard']);
  });

  it('routes an authenticated suspended context to safe administration', () => {
    authStore.isAuthenticated.mockReturnValue(true);
    tenantContextStore.isAdminSuspendedContext.mockReturnValue(true);

    expect(runGuard()).toEqual(['/organization-administration']);
  });

  it('routes other authenticated context states away from account creation', () => {
    authStore.isAuthenticated.mockReturnValue(true);

    expect(runGuard()).toEqual(['/organization-selection']);
  });

  function runGuard(): unknown {
    return TestBed.runInInjectionContext(() =>
      anonymousOnlyGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }
});
