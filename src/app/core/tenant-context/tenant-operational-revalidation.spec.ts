import { HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router, RouterOutlet } from '@angular/router';

import { AuthStore } from '../auth/auth.store';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { AuthContextResponseV1 } from './tenant-context.models';
import { TenantContextService } from './tenant-context.service';
import { TenantContextStore } from './tenant-context.store';
import { TenantStateInvalidationCoordinator } from './tenant-state-invalidation.coordinator';
import { tenantStateInterceptor } from './tenant-state.interceptor';

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
    resolutionMode: 'EXPLICIT',
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
  capabilities: ['organization.read', 'patient.read'],
  selectableMemberships: [],
  preferredOrganizationId: null,
};

const noActiveTenantContext: AuthContextResponseV1 = {
  schemaVersion: 1,
  status: 'NO_ACTIVE_TENANT',
  tenantContext: null,
  organization: null,
  membership: null,
  capabilities: [],
  selectableMemberships: [],
  preferredOrganizationId: null,
};

const suspendedOrganizationContext: AuthContextResponseV1 = {
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
};

function contextForOrganizationB(): AuthContextResponseV1 {
  return {
    ...activeContext,
    tenantContext: {
      ...activeContext.tenantContext!,
      organizationId: 'organization-b',
      membershipId: 'membership-b',
      organizationRole: 'ADMIN',
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
  };
}

@Component({
  selector: 'app-test-tenant-data-page',
  standalone: true,
  template: '<p>Previously loaded Organization A patient data</p>',
})
class TenantDataPage {}

@Component({
  selector: 'app-test-organization-selection-page',
  standalone: true,
  template: '<p>Organization selection</p>',
})
class OrganizationSelectionPage {}

@Component({
  selector: 'app-test-organization-administration-page',
  standalone: true,
  template: '<p>Organization administration</p>',
})
class OrganizationAdministrationPage {}

@Component({
  selector: 'app-test-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class TestShell {}

describe('Operational 403 tenant context revalidation', () => {
  let fixture: ComponentFixture<TestShell>;
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let router: Router;
  let store: TenantContextStore;
  let closeAll: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.setItem('psychology_app_access_token', 'active-token');
    localStorage.setItem('psychology_app_auth_user', JSON.stringify(user));
    sessionStorage.clear();
    closeAll = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        TenantContextService,
        TenantContextStore,
        TenantStateInvalidationCoordinator,
        provideRouter([
          { path: 'patients', component: TenantDataPage },
          { path: 'organization-selection', component: OrganizationSelectionPage },
          { path: 'organization-administration', component: OrganizationAdministrationPage },
        ]),
        provideHttpClient(withInterceptors([authInterceptor, tenantStateInterceptor])),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: { closeAll } },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    store = TestBed.inject(TenantContextStore);
    TestBed.inject(TenantStateInvalidationCoordinator);

    const bootstrap = store.bootstrap();
    httpTesting.expectOne('/api/auth/context').flush(activeContext);
    await bootstrap;

    fixture = TestBed.createComponent(TestShell);
    await router.navigateByUrl('/patients');
    fixture.detectChanges();
    closeAll.mockClear();
  });

  afterEach(() => {
    httpTesting.verify({ ignoreCancelled: true });
    fixture.destroy();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  it.each([
    ['revoked', noActiveTenantContext],
    ['suspended', noActiveTenantContext],
  ])(
    'invalidates operational state after a 403 when membership is %s',
    async (_membershipState, contextResponse) => {
      expect(fixture.nativeElement.textContent).toContain('Organization A patient data');

      http.get('/api/patients').subscribe();
      httpTesting.expectOne('/api/patients').flush({}, { status: 403, statusText: 'Forbidden' });
      httpTesting.expectOne('/api/auth/context').flush(contextResponse);

      await vi.waitFor(() => expect(store.state()).toBe('NO_ACTIVE_TENANT'));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(store.selectedOrganizationId()).toBeNull();
      expect(store.capabilities()).toEqual([]);
      expect(store.switchGeneration()).toBe(2);
      expect(closeAll).toHaveBeenCalledOnce();
      expect(router.url).toBe('/organization-selection');
      expect(fixture.nativeElement.textContent).not.toContain('Organization A patient data');
    },
  );

  it('removes operational state after a 403 confirms organization suspension', async () => {
    http.get('/api/patients').subscribe();
    httpTesting.expectOne('/api/patients').flush({}, { status: 403, statusText: 'Forbidden' });
    httpTesting.expectOne('/api/auth/context').flush(suspendedOrganizationContext);

    await vi.waitFor(() => expect(store.state()).toBe('ADMIN_SUSPENDED_CONTEXT'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(store.selectedOrganizationId()).toBe('organization-a');
    expect(store.capabilities()).toEqual(['organization.read']);
    expect(store.hasCapability('patient.read')).toBe(false);
    expect(store.switchGeneration()).toBe(2);
    expect(closeAll).toHaveBeenCalledOnce();
    expect(router.url).toBe('/organization-administration');
    expect(fixture.nativeElement.textContent).not.toContain('Organization A patient data');
    expect(fixture.nativeElement.textContent).toContain('Organization administration');
  });

  it('preserves the tenant and propagates a capability-denied 403 after a valid revalidation', async () => {
    const errors: unknown[] = [];

    http.get('/api/patients/restricted-operation').subscribe({
      error: (error) => errors.push(error),
    });
    httpTesting
      .expectOne('/api/patients/restricted-operation')
      .flush({}, { status: 403, statusText: 'Forbidden' });

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.snapshot()).toEqual(activeContext);
    expect(fixture.nativeElement.textContent).toContain('Organization A patient data');

    httpTesting.expectOne('/api/auth/context').flush(activeContext);

    await vi.waitFor(() => expect(errors).toHaveLength(1));

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-a');
    expect(store.switchGeneration()).toBe(1);
    expect(store.contextVersion()).toBe(2);
    expect(closeAll).not.toHaveBeenCalled();
    expect(router.url).toBe('/patients');
    expect(fixture.nativeElement.textContent).toContain('Organization A patient data');
  });

  it('coalesces simultaneous operational 403 responses into one context request', async () => {
    const errors: unknown[] = [];

    for (const suffix of ['one', 'two', 'three']) {
      http.get(`/api/tenant-operation-${suffix}`).subscribe({
        error: (error) => errors.push(error),
      });
    }

    for (const suffix of ['one', 'two', 'three']) {
      httpTesting
        .expectOne(`/api/tenant-operation-${suffix}`)
        .flush({}, { status: 403, statusText: 'Forbidden' });
    }

    httpTesting.expectOne('/api/auth/context').flush(activeContext);

    await vi.waitFor(() => expect(errors).toHaveLength(3));
    httpTesting.expectNone('/api/auth/context');
    expect(store.switchGeneration()).toBe(1);
    expect(store.contextVersion()).toBe(2);
  });

  it('keeps transient context failure separate from confirmed access loss', async () => {
    const errors: unknown[] = [];

    http.get('/api/patients').subscribe({ error: (error) => errors.push(error) });
    httpTesting.expectOne('/api/patients').flush({}, { status: 403, statusText: 'Forbidden' });
    httpTesting
      .expectOne('/api/auth/context')
      .flush({}, { status: 503, statusText: 'Service Unavailable' });

    await vi.waitFor(() => expect(errors).toHaveLength(1));

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.selectedOrganizationId()).toBe('organization-a');
    expect(store.capabilities()).toEqual(['organization.read', 'patient.read']);
    expect(store.switchGeneration()).toBe(1);
    expect(store.contextVersion()).toBe(1);
    expect(store.error()?.statusCode).toBe(503);
    expect(closeAll).not.toHaveBeenCalled();
    expect(router.url).toBe('/patients');
  });

  it('discards an Organization A revalidation response after switching to Organization B', async () => {
    http.get('/api/patients').subscribe();
    httpTesting.expectOne('/api/patients').flush({}, { status: 403, statusText: 'Forbidden' });
    const revalidationA = httpTesting.expectOne(
      (request) =>
        request.url === '/api/auth/context' &&
        request.headers.get('X-Organization-Id') === 'organization-a',
    );

    const switchToB = store.switchTenant('organization-b');
    httpTesting
      .expectOne(
        (request) =>
          request.url === '/api/auth/context' &&
          request.headers.get('X-Organization-Id') === 'organization-b',
      )
      .flush(contextForOrganizationB());
    await switchToB;

    revalidationA.flush(noActiveTenantContext);
    await vi.waitFor(() => expect(store.selectedOrganizationId()).toBe('organization-b'));

    expect(store.state()).toBe('ACTIVE_TENANT_READY');
    expect(store.snapshot()?.organization?.displayName).toBe('Organization B');
    expect(store.switchGeneration()).toBe(2);
    expect(store.contextVersion()).toBe(2);
    expect(closeAll).toHaveBeenCalledOnce();
  });

  it('cancels stale operational work before late 403, 404, or 500 errors can affect B', async () => {
    const errors: unknown[] = [];
    const staleRequests = [403, 404, 500].map((status) => {
      http.get(`/api/stale-${status}`).subscribe({ error: (error) => errors.push(error) });
      return httpTesting.expectOne(`/api/stale-${status}`);
    });

    const switchToB = store.switchTenant('organization-b');
    httpTesting
      .expectOne(
        (request) =>
          request.url === '/api/auth/context' &&
          request.headers.get('X-Organization-Id') === 'organization-b',
      )
      .flush(contextForOrganizationB());
    await switchToB;

    expect(staleRequests.every((request) => request.cancelled)).toBe(true);
    expect(errors).toEqual([]);
    expect(store.selectedOrganizationId()).toBe('organization-b');
    expect(store.snapshot()?.organization?.displayName).toBe('Organization B');
  });
});
