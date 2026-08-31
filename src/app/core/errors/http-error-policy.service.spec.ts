import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';

import { AuthUser } from '../auth/auth.models';
import { AuthStore } from '../auth/auth.store';
import { QuotaPaywallDialogService } from '../billing/quota-paywall-dialog.service';
import { getHttpErrorKind, HttpErrorPolicyService } from './http-error-policy.service';

const user: AuthUser = {
  id: 'user-1',
  name: 'Dra. Rivera',
  email: 'rivera@example.com',
  role: 'PSYCHOLOGIST',
};

describe('getHttpErrorKind', () => {
  it.each([
    [0, 'network'],
    [401, 'unauthorized'],
    [402, 'payment-required'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [429, 'rate-limited'],
    [500, 'server'],
    [503, 'server'],
    [400, 'other'],
  ] as const)('classifies status %i as %s', (status, expectedKind) => {
    expect(getHttpErrorKind(status)).toBe(expectedKind);
  });
});

describe('HttpErrorPolicyService', () => {
  let mockPaywallService: { openQuotaExceededDialog: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPaywallService = {
      openQuotaExceededDialog: vi.fn(),
    };
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clears an authenticated session and starts login navigation for a 401', () => {
    const router = createRouter('/dashboard');
    const { service, store } = configureService(router, mockPaywallService);
    store.setSession('active-token', user);

    const result = service.handle(unauthorizedError(), '/api/patients');

    expect(result).toBe('unauthorized');
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('psychology_app_access_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('handles 402 Payment Required by triggering QuotaPaywallDialogService', () => {
    const router = createRouter('/dashboard');
    const { service } = configureService(router, mockPaywallService);

    const error402 = new HttpErrorResponse({
      status: 402,
      statusText: 'Payment Required',
      error: {
        statusCode: 402,
        error: 'QUOTA_EXCEEDED',
        code: 'QUOTA_EXCEEDED',
        resource: 'THERAPISTS',
        currentUsage: 3,
        maxAllowed: 3,
        currentTier: 'STARTER',
        suggestedTier: 'PRO',
        message: 'Límite de terapeutas alcanzado.',
      },
    });

    const result = service.handle(error402, '/api/therapists');

    expect(result).toBe('payment-required');
    expect(mockPaywallService.openQuotaExceededDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 402,
        resource: 'THERAPISTS',
        currentUsage: 3,
        maxAllowed: 3,
        currentTier: 'STARTER',
        suggestedTier: 'PRO',
      }),
    );
  });

  it('handles QUOTA_EXCEEDED payload even if returned on non-402 status', () => {
    const router = createRouter('/dashboard');
    const { service } = configureService(router, mockPaywallService);

    const customError = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: {
        statusCode: 400,
        code: 'QUOTA_EXCEEDED',
        resource: 'BRANCHES',
        currentUsage: 1,
        maxAllowed: 1,
        currentTier: 'STARTER',
        suggestedTier: 'PRO',
      },
    });

    service.handle(customError, '/api/branches');

    expect(mockPaywallService.openQuotaExceededDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'BRANCHES',
      }),
    );
  });

  it('does not handle a 401 from the login endpoint as session expiration', () => {
    const router = createRouter('/login');
    const { service, store } = configureService(router, mockPaywallService);
    store.setSession('active-token', user);

    const result = service.handle(unauthorizedError(), '/api/auth/login?attempt=2');

    expect(result).toBe('unauthorized');
    expect(store.token()).toBe('active-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not handle a 401 from the teleconsultation access endpoint as session expiration', () => {
    const router = createRouter('/teleconsulta/room123');
    const { service, store } = configureService(router, mockPaywallService);
    store.setSession('active-token', user);

    const result = service.handle(
      unauthorizedError(),
      '/api/teleconsultation/access/room123?token=invalid',
    );

    expect(result).toBe('unauthorized');
    expect(store.token()).toBe('active-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not clear the session or navigate for a 403', () => {
    const router = createRouter('/reports');
    const { service, store } = configureService(router, mockPaywallService);
    store.setSession('active-token', user);

    const result = service.handle(
      new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }),
      '/api/reports',
    );

    expect(result).toBe('forbidden');
    expect(store.token()).toBe('active-token');
    expect(store.isAuthenticated()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deduplicates navigation while a session-expiration redirect is pending', async () => {
    let resolveNavigation: ((value: boolean) => void) | undefined;
    const pendingNavigation = new Promise<boolean>((resolve) => {
      resolveNavigation = resolve;
    });
    const router = {
      url: '/dashboard',
      navigate: vi.fn(() => pendingNavigation),
    };
    const authStore = {
      isAuthenticated: vi.fn(() => true),
      clearSession: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthStore, useValue: authStore },
        { provide: QuotaPaywallDialogService, useValue: mockPaywallService },
      ],
    });
    const service = TestBed.inject(HttpErrorPolicyService);

    service.handle(unauthorizedError(), '/api/patients');
    service.handle(unauthorizedError(), '/api/appointments');

    expect(authStore.clearSession).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledOnce();

    resolveNavigation?.(true);
    await pendingNavigation;

    service.handle(unauthorizedError(), '/api/reports');
    expect(router.navigate).toHaveBeenCalledTimes(2);
  });
});

function configureService(
  router: { url: string; navigate: ReturnType<typeof vi.fn> },
  paywallService?: { openQuotaExceededDialog: ReturnType<typeof vi.fn> },
): {
  service: HttpErrorPolicyService;
  store: AuthStore;
} {
  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: router },
      {
        provide: QuotaPaywallDialogService,
        useValue: paywallService ?? { openQuotaExceededDialog: vi.fn() },
      },
    ],
  });

  return {
    service: TestBed.inject(HttpErrorPolicyService),
    store: TestBed.inject(AuthStore),
  };
}

function createRouter(url: string): { url: string; navigate: ReturnType<typeof vi.fn> } {
  return {
    url,
    navigate: vi.fn(() => Promise.resolve(true)),
  };
}

function unauthorizedError(): HttpErrorResponse {
  return new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
}
