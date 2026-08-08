import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { TenantContextService } from './tenant-context.service';
import { AuthContextPreferenceResponse, AuthContextResponseV1 } from './tenant-context.models';
import { TenantContextStore } from './tenant-context.store';

const user = {
  id: 'user-1',
  name: 'Dra. Rivera',
  email: 'rivera@example.com',
  role: 'PSYCHOLOGIST' as const,
};

const activeContext: AuthContextResponseV1 = {
  schemaVersion: 1,
  status: 'ACTIVE_TENANT_READY',
  tenantContext: {
    userId: user.id,
    organizationId: 'organization-a',
    membershipId: 'membership-a',
    organizationRole: 'OWNER',
    resolutionMode: 'SINGLE_MEMBERSHIP',
  },
  organization: {
    id: 'organization-a',
    displayName: 'Organization A',
    status: 'ACTIVE',
  },
  membership: {
    id: 'membership-a',
    userId: user.id,
    displayName: user.name,
    email: user.email,
    role: 'OWNER',
    status: 'ACTIVE',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    isCurrentUser: true,
  },
  capabilities: ['organization.read'],
  selectableMemberships: [],
  preferredOrganizationId: null,
};

const selectableMemberships: AuthContextResponseV1['selectableMemberships'] = [
  {
    membershipId: 'membership-a',
    organizationId: 'organization-a',
    organizationDisplayName: 'Organization A',
    organizationRole: 'OWNER',
  },
  {
    membershipId: 'membership-b',
    organizationId: 'organization-b',
    organizationDisplayName: 'Organization B',
    organizationRole: 'ADMIN',
  },
];

function contextForOrganization(
  organizationId: 'organization-a' | 'organization-b',
  preferredOrganizationId: string | null = null,
): AuthContextResponseV1 {
  const isOrganizationA = organizationId === 'organization-a';

  return {
    ...activeContext,
    tenantContext: {
      ...activeContext.tenantContext!,
      organizationId,
      membershipId: isOrganizationA ? 'membership-a' : 'membership-b',
      organizationRole: isOrganizationA ? 'OWNER' : 'ADMIN',
      resolutionMode: 'EXPLICIT',
    },
    organization: {
      ...activeContext.organization!,
      id: organizationId,
      displayName: isOrganizationA ? 'Organization A' : 'Organization B',
    },
    membership: {
      ...activeContext.membership!,
      id: isOrganizationA ? 'membership-a' : 'membership-b',
      role: isOrganizationA ? 'OWNER' : 'ADMIN',
    },
    selectableMemberships,
    preferredOrganizationId,
  };
}

function ambiguousContext(preferredOrganizationId: string | null): AuthContextResponseV1 {
  return {
    ...activeContext,
    status: 'AMBIGUOUS_SELECTION',
    tenantContext: null,
    organization: null,
    membership: null,
    capabilities: [],
    selectableMemberships,
    preferredOrganizationId,
  };
}

describe('TenantContextStore', () => {
  let store: TenantContextStore;
  let authStore: AuthStore;
  let contextService: {
    getContext: ReturnType<typeof vi.fn>;
    updatePreferredOrganization: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.setItem('psychology_app_access_token', 'active-token');
    localStorage.setItem('psychology_app_auth_user', JSON.stringify(user));
    sessionStorage.clear();

    contextService = {
      getContext: vi.fn(() => of(activeContext)),
      updatePreferredOrganization: vi.fn(() => of({ preferredOrganizationId: 'organization-a' })),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        TenantContextStore,
        { provide: TenantContextService, useValue: contextService },
      ],
    });

    authStore = TestBed.inject(AuthStore);
    store = TestBed.inject(TenantContextStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('loads an active V1 snapshot and persists only the confirmed organization per tab', async () => {
    await store.bootstrap();

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-a');
    expect(store.candidateOrganizationId()).toBeNull();
    expect(store.contextVersion()).toBe(1);
    expect(store.switchGeneration()).toBe(1);
    expect(store.hasCapability('organization.read')).toBe(true);
    expect(sessionStorage.getItem('psychology_app_selected_organization_id')).toBe(
      'organization-a',
    );
    expect(contextService.getContext).toHaveBeenCalledWith(null);
  });

  it('hides the previous tenant while switching and accepts only the current generation', async () => {
    const ambiguousContext: AuthContextResponseV1 = {
      schemaVersion: 1,
      status: 'AMBIGUOUS_SELECTION',
      tenantContext: null,
      organization: null,
      membership: null,
      capabilities: [],
      selectableMemberships: [
        {
          membershipId: 'membership-a',
          organizationId: 'organization-a',
          organizationDisplayName: 'Organization A',
          organizationRole: 'OWNER',
        },
        {
          membershipId: 'membership-b',
          organizationId: 'organization-b',
          organizationDisplayName: 'Organization B',
          organizationRole: 'ADMIN',
        },
      ],
      preferredOrganizationId: null,
    };
    const switchedContext = {
      ...activeContext,
      tenantContext: {
        ...activeContext.tenantContext!,
        organizationId: 'organization-b',
        membershipId: 'membership-b',
        organizationRole: 'ADMIN',
        resolutionMode: 'EXPLICIT' as const,
      },
      organization: {
        ...activeContext.organization!,
        id: 'organization-b',
        displayName: 'Organization B',
      },
      membership: {
        ...activeContext.membership!,
        id: 'membership-b',
        role: 'ADMIN' as const,
      },
    };

    contextService.getContext
      .mockReturnValueOnce(of(ambiguousContext))
      .mockReturnValueOnce(of(switchedContext));

    await store.bootstrap();
    expect(store.state()).toBe('AMBIGUOUS_SELECTION');
    expect(store.selectedOrganizationId()).toBeNull();

    await store.switchTenant('organization-b');

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-b');
    expect(store.candidateOrganizationId()).toBeNull();
    expect(store.switchGeneration()).toBe(2);
    expect(store.contextVersion()).toBe(2);
    expect(sessionStorage.getItem('psychology_app_selected_organization_id')).toBe(
      'organization-b',
    );
    expect(contextService.getContext).toHaveBeenLastCalledWith('organization-b');
  });

  it('restores a backend-confirmed preferred organization without a redundant PUT', async () => {
    contextService.getContext
      .mockReturnValueOnce(of(ambiguousContext('organization-b')))
      .mockReturnValueOnce(of(contextForOrganization('organization-b', 'organization-b')));

    await store.bootstrap();

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-b');
    expect(contextService.getContext).toHaveBeenNthCalledWith(2, 'organization-b');
    expect(contextService.updatePreferredOrganization).not.toHaveBeenCalled();
  });

  it('persists a manually selected organization after the context is confirmed', async () => {
    const selectedContext = {
      ...activeContext,
      tenantContext: {
        ...activeContext.tenantContext!,
        organizationId: 'organization-b',
        membershipId: 'membership-b',
        organizationRole: 'ADMIN',
        resolutionMode: 'EXPLICIT' as const,
      },
      organization: {
        ...activeContext.organization!,
        id: 'organization-b',
        displayName: 'Organization B',
      },
      membership: {
        ...activeContext.membership!,
        id: 'membership-b',
        role: 'ADMIN' as const,
      },
    };
    contextService.getContext.mockReturnValueOnce(of(selectedContext));

    await store.selectOrganization('organization-b');

    expect(store.selectedOrganizationId()).toBe('organization-b');
    expect(contextService.updatePreferredOrganization).toHaveBeenCalledWith('organization-b');
  });

  it('does not block confirmed tenant readiness while the preferred PUT is pending', async () => {
    const preferenceWrite = new Subject<AuthContextPreferenceResponse>();
    contextService.getContext.mockReturnValueOnce(
      of(contextForOrganization('organization-b', 'organization-a')),
    );
    contextService.updatePreferredOrganization.mockReturnValueOnce(preferenceWrite.asObservable());

    await store.selectOrganization('organization-b');

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-b');
    expect(store.preferredOrganizationId()).toBe('organization-a');
    expect(store.preferredPersistenceState()).toBe('SAVING');
    expect(preferenceWrite.observed).toBe(true);

    preferenceWrite.next({ preferredOrganizationId: 'organization-b' });
    await Promise.resolve();

    expect(store.preferredPersistenceState()).toBe('SAVED');
    expect(store.preferredOrganizationId()).toBe('organization-b');
    expect(preferenceWrite.observed).toBe(false);
  });

  it('uses the canonical PUT response to update preferred metadata', async () => {
    contextService.getContext.mockReturnValueOnce(
      of(contextForOrganization('organization-b', 'organization-a')),
    );
    contextService.updatePreferredOrganization.mockReturnValueOnce(
      of({ preferredOrganizationId: 'organization-c' }),
    );

    await store.selectOrganization('organization-b');
    await Promise.resolve();

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-b');
    expect(store.preferredOrganizationId()).toBe('organization-c');
    expect(store.snapshot()?.preferredOrganizationId).toBe('organization-c');
    expect(store.preferredPersistenceState()).toBe('SAVED');
  });

  it('keeps the active tenant and last confirmed preference when the PUT fails', async () => {
    contextService.getContext.mockReturnValueOnce(
      of(contextForOrganization('organization-b', 'organization-a')),
    );
    contextService.updatePreferredOrganization.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: { code: 'PREFERENCE_UNAVAILABLE', message: 'Preference unavailable' },
          }),
      ),
    );

    await store.selectOrganization('organization-b');
    await Promise.resolve();

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-b');
    expect(store.preferredOrganizationId()).toBe('organization-a');
    expect(store.preferredPersistenceState()).toBe('ERROR');
    expect(store.preferredPersistenceError()?.code).toBe('PREFERENCE_UNAVAILABLE');
  });

  it('ignores a stale preference response after a newer tenant switch', async () => {
    const stalePreferenceWrite = new Subject<AuthContextPreferenceResponse>();
    contextService.getContext
      .mockReturnValueOnce(of(contextForOrganization('organization-b', 'organization-a')))
      .mockReturnValueOnce(of(contextForOrganization('organization-a', 'organization-a')));
    contextService.updatePreferredOrganization.mockReturnValueOnce(
      stalePreferenceWrite.asObservable(),
    );

    await store.selectOrganization('organization-b');
    await store.selectOrganization('organization-a');

    stalePreferenceWrite.next({ preferredOrganizationId: 'organization-b' });
    await Promise.resolve();

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-a');
    expect(store.preferredOrganizationId()).toBe('organization-a');
    expect(stalePreferenceWrite.observed).toBe(false);
  });

  it('preserves identity-level recovery options without restoring the previous tenant', async () => {
    contextService.getContext
      .mockReturnValueOnce(of(contextForOrganization('organization-a', 'organization-a')))
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 500,
              error: { code: 'TENANT_LOAD_FAILED', message: 'Tenant load failed' },
            }),
        ),
      )
      .mockReturnValueOnce(of(contextForOrganization('organization-b', 'organization-a')));

    await store.bootstrap();
    await store.selectOrganization('organization-b');

    expect(store.state()).toBe('ERROR');
    expect(store.error()?.code).toBe('TENANT_LOAD_FAILED');
    expect(store.candidateOrganizationId()).toBe('organization-b');
    expect(store.selectableMemberships()).toEqual(selectableMemberships);
    expect(store.selectedOrganizationId()).toBeNull();
    expect(store.snapshot()).toBeNull();
    expect(store.capabilities()).toEqual([]);
    expect(sessionStorage.getItem('psychology_app_selected_organization_id')).toBeNull();

    await store.selectOrganization('organization-b');

    expect(contextService.getContext).toHaveBeenLastCalledWith('organization-b');
    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-b');
  });

  it('uses only the backend-confirmed preference on the next bootstrap', async () => {
    contextService.getContext
      .mockReturnValueOnce(of(contextForOrganization('organization-b', 'organization-a')))
      .mockReturnValueOnce(of(ambiguousContext('organization-a')))
      .mockReturnValueOnce(of(contextForOrganization('organization-a', 'organization-a')));
    contextService.updatePreferredOrganization.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );

    await store.selectOrganization('organization-b');
    await Promise.resolve();
    store.resetTenantState('test-bootstrap');
    await store.bootstrap();

    expect(store.selectedOrganizationId()).toBe('organization-a');
    expect(store.preferredOrganizationId()).toBe('organization-a');
    expect(contextService.getContext).toHaveBeenLastCalledWith('organization-a');
    expect(contextService.updatePreferredOrganization).toHaveBeenCalledTimes(1);
  });

  it('enters ERROR for an unsafe V1 response and resetTenantState is idempotent', async () => {
    contextService.getContext.mockReturnValue(
      of({
        ...activeContext,
        schemaVersion: 2,
      }),
    );

    await store.bootstrap();

    expect(store.state()).toBe('ERROR');
    expect(store.selectedOrganizationId()).toBeNull();

    store.resetTenantState('retry');
    const generation = store.switchGeneration();
    store.resetTenantState('retry', generation);

    expect(store.state()).toBe('UNINITIALIZED');
    expect(store.selectedOrganizationId()).toBeNull();
    expect(store.contextVersion()).toBe(0);
    expect(store.switchGeneration()).toBe(generation);
    expect(authStore.isAuthenticated()).toBe(true);
  });
  it('rejects a response with a missing required V1 field', async () => {
    contextService.getContext.mockReturnValue(
      of({
        ...activeContext,
        preferredOrganizationId: undefined,
      } as never),
    );

    await store.bootstrap();

    expect(store.state()).toBe('ERROR');
    expect(store.error()?.code).toBe('UNEXPECTED_ERROR');
  });

  it('accepts an administrative suspended context without operational capabilities', async () => {
    contextService.getContext.mockReturnValue(
      of({
        ...activeContext,
        status: 'ADMIN_SUSPENDED_CONTEXT',
        tenantContext: {
          ...activeContext.tenantContext!,
          organizationRole: 'ADMIN',
        },
        organization: {
          ...activeContext.organization!,
          status: 'SUSPENDED',
        },
        membership: {
          ...activeContext.membership!,
          role: 'ADMIN',
        },
        capabilities: ['organization.read'],
      }),
    );

    await store.bootstrap();

    expect(store.state()).toBe('ADMIN_SUSPENDED_CONTEXT');
    expect(store.isAdminSuspendedContext()).toBe(true);
    expect(store.hasCapability('organization.read')).toBe(true);
    expect(store.hasCapability('patient.read')).toBe(false);
  });

  it('rejects a resolved response whose identity projections do not agree', async () => {
    contextService.getContext.mockReturnValue(
      of({
        ...activeContext,
        organization: {
          ...activeContext.organization!,
          id: 'organization-b',
        },
      }),
    );

    await store.bootstrap();

    expect(store.state()).toBe('ERROR');
    expect(store.selectedOrganizationId()).toBeNull();
  });

  it('discards an older same-tenant refresh response', async () => {
    const firstRefresh = new Subject<AuthContextResponseV1>();
    const secondRefresh = new Subject<AuthContextResponseV1>();

    await store.bootstrap();
    contextService.getContext
      .mockReturnValueOnce(firstRefresh.asObservable())
      .mockReturnValueOnce(secondRefresh.asObservable());

    const firstRequest = store.refreshContext();
    const secondRequest = store.refreshContext();
    const latestContext = {
      ...activeContext,
      organization: {
        ...activeContext.organization!,
        displayName: 'Latest organization',
      },
    };
    const staleContext = {
      ...activeContext,
      organization: {
        ...activeContext.organization!,
        displayName: 'Stale organization',
      },
    };

    secondRefresh.next(latestContext);
    secondRefresh.complete();
    await secondRequest;

    firstRefresh.next(staleContext);
    firstRefresh.complete();
    await firstRequest;

    expect(store.snapshot()?.organization?.displayName).toBe('Latest organization');
    expect(store.contextVersion()).toBe(2);
  });
});
