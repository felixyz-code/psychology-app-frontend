import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { billingGuard } from './billing.guard';

describe('billingGuard', () => {
  let mockStore: {
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    isAdminSuspendedContext: ReturnType<typeof vi.fn>;
    snapshot: ReturnType<typeof vi.fn>;
    hasCapability: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockStore = {
      isActiveTenantReady: vi.fn().mockReturnValue(true),
      isAdminSuspendedContext: vi.fn().mockReturnValue(false),
      snapshot: vi.fn().mockReturnValue({
        tenantContext: { organizationRole: 'OWNER' },
      }),
      hasCapability: vi.fn().mockReturnValue(false),
    };

    mockRouter = {
      createUrlTree: vi.fn((commands: string[]) => ({ toString: () => commands.join('/') }) as unknown as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: TenantContextStore, useValue: mockStore },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should allow access if role is OWNER', () => {
    mockStore.snapshot.mockReturnValue({
      tenantContext: { organizationRole: 'OWNER' },
    });

    const result = TestBed.runInInjectionContext(() =>
      billingGuard({} as any, {} as any),
    );

    expect(result).toBe(true);
  });

  it('should allow access if role is BILLING', () => {
    mockStore.snapshot.mockReturnValue({
      tenantContext: { organizationRole: 'BILLING' },
    });

    const result = TestBed.runInInjectionContext(() =>
      billingGuard({} as any, {} as any),
    );

    expect(result).toBe(true);
  });

  it('should allow access if user has finance.manage capability', () => {
    mockStore.snapshot.mockReturnValue({
      tenantContext: { organizationRole: 'ADMIN' },
    });
    mockStore.hasCapability.mockImplementation((cap: string) => cap === 'finance.manage');

    const result = TestBed.runInInjectionContext(() =>
      billingGuard({} as any, {} as any),
    );

    expect(result).toBe(true);
  });

  it('should redirect to /dashboard if role is PSYCHOLOGIST without billing capabilities', () => {
    mockStore.snapshot.mockReturnValue({
      tenantContext: { organizationRole: 'PSYCHOLOGIST' },
    });
    mockStore.hasCapability.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      billingGuard({} as any, {} as any),
    );

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).not.toBe(true);
  });

  it('should return false if tenant is not ready', () => {
    mockStore.isActiveTenantReady.mockReturnValue(false);
    mockStore.isAdminSuspendedContext.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      billingGuard({} as any, {} as any),
    );

    expect(result).toBe(false);
  });
});
