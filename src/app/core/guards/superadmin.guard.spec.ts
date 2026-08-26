import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../auth/auth.store';
import { superadminGuard } from './superadmin.guard';

describe('superadminGuard', () => {
  let mockAuthStore: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isAdmin: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthStore = {
      isAuthenticated: vi.fn(),
      isAdmin: vi.fn(),
    };
    mockRouter = {
      createUrlTree: vi.fn((commands: any[]) => ({ path: commands[0] }) as unknown as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('allows activation when user is authenticated and has ADMIN role', () => {
    mockAuthStore.isAuthenticated.mockReturnValue(true);
    mockAuthStore.isAdmin.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      superadminGuard({} as any, {} as any),
    );

    expect(result).toBe(true);
  });

  it('redirects to /login when user is not authenticated', () => {
    mockAuthStore.isAuthenticated.mockReturnValue(false);
    mockAuthStore.isAdmin.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      superadminGuard({} as any, {} as any),
    );

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({ path: '/login' });
  });

  it('redirects to /dashboard when user is authenticated but not an ADMIN', () => {
    mockAuthStore.isAuthenticated.mockReturnValue(true);
    mockAuthStore.isAdmin.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      superadminGuard({} as any, {} as any),
    );

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toEqual({ path: '/dashboard' });
  });
});
