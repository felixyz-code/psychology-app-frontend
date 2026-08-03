import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { TenantContextService } from './tenant-context.service';
import { AuthContextResponseV1 } from './tenant-context.models';
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

  it('restores a valid preferred organization through the explicit switch flow', async () => {
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
      preferredOrganizationId: 'organization-b',
    };
    const preferredContext: AuthContextResponseV1 = {
      ...activeContext,
      tenantContext: {
        ...activeContext.tenantContext!,
        organizationId: 'organization-b',
        membershipId: 'membership-b',
        organizationRole: 'ADMIN',
        resolutionMode: 'EXPLICIT',
      },
      organization: {
        ...activeContext.organization!,
        id: 'organization-b',
        displayName: 'Organization B',
      },
      membership: {
        ...activeContext.membership!,
        id: 'membership-b',
        role: 'ADMIN',
      },
      selectableMemberships: [
        {
          membershipId: 'membership-b',
          organizationId: 'organization-b',
          organizationDisplayName: 'Organization B',
          organizationRole: 'ADMIN',
        },
      ],
      preferredOrganizationId: 'organization-b',
    };

    contextService.getContext
      .mockReturnValueOnce(of(ambiguousContext))
      .mockReturnValueOnce(of(preferredContext));

    await store.bootstrap();

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-b');
    expect(contextService.getContext).toHaveBeenNthCalledWith(2, 'organization-b');
    expect(contextService.updatePreferredOrganization).toHaveBeenCalledWith('organization-b');
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
