import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  TENANT_HTTP_MODE,
  TENANT_ORGANIZATION_ID,
} from '../../../core/tenant-context/tenant-http-context';
import { MembershipListItem } from '../models/membership.models';
import { MembershipsService } from './memberships.service';

describe('MembershipsService', () => {
  let service: MembershipsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(MembershipsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('lists memberships in the explicitly captured tenant context', () => {
    service.list('organization-a').subscribe();

    const request = httpTesting.expectOne('/api/organizations/organization-a/memberships');

    expect(request.request.method).toBe('GET');
    expectTenantContext(request.request.context, 'organization-a');

    request.flush([createMembership()]);
  });

  it('changes role with the observed membership version', () => {
    service
      .changeRole('organization-a', 'membership-a', {
        role: 'PSYCHOLOGIST',
        expectedUpdatedAt: '2026-08-08T12:00:00.000Z',
      })
      .subscribe();

    const request = httpTesting.expectOne(
      '/api/organizations/organization-a/memberships/membership-a/role',
    );

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      role: 'PSYCHOLOGIST',
      expectedUpdatedAt: '2026-08-08T12:00:00.000Z',
    });
    expectTenantContext(request.request.context, 'organization-a');

    request.flush(createMutationResponse({ role: 'PSYCHOLOGIST' }));
  });

  it('changes status with the observed membership version', () => {
    service
      .changeStatus('organization-a', 'membership-a', {
        status: 'SUSPENDED',
        expectedUpdatedAt: '2026-08-08T12:00:00.000Z',
      })
      .subscribe();

    const request = httpTesting.expectOne(
      '/api/organizations/organization-a/memberships/membership-a/status',
    );

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      status: 'SUSPENDED',
      expectedUpdatedAt: '2026-08-08T12:00:00.000Z',
    });
    expectTenantContext(request.request.context, 'organization-a');

    request.flush(createMutationResponse({ status: 'SUSPENDED' }));
  });

  it('removes a membership using a DELETE body with the observed version', () => {
    service
      .remove('organization-a', 'membership-a', {
        expectedUpdatedAt: '2026-08-08T12:00:00.000Z',
      })
      .subscribe();

    const request = httpTesting.expectOne(
      '/api/organizations/organization-a/memberships/membership-a',
    );

    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({
      expectedUpdatedAt: '2026-08-08T12:00:00.000Z',
    });
    expectTenantContext(request.request.context, 'organization-a');

    request.flush(createMutationResponse({ status: 'REVOKED' }));
  });

  it('leaves the organization with the observed membership version', () => {
    service
      .leave('organization-a', {
        expectedUpdatedAt: '2026-08-08T12:00:00.000Z',
      })
      .subscribe();

    const request = httpTesting.expectOne('/api/organizations/organization-a/memberships/leave');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      expectedUpdatedAt: '2026-08-08T12:00:00.000Z',
    });
    expectTenantContext(request.request.context, 'organization-a');

    request.flush(createMutationResponse({ status: 'REVOKED' }));
  });
});

function expectTenantContext(
  context: import('@angular/common/http').HttpContext,
  organizationId: string,
): void {
  expect(context.get(TENANT_HTTP_MODE)).toBe('TENANT_REQUIRED');
  expect(context.get(TENANT_ORGANIZATION_ID)).toBe(organizationId);
}

function createMembership(overrides: Partial<MembershipListItem> = {}): MembershipListItem {
  return {
    id: 'membership-a',
    userId: 'user-a',
    displayName: 'Ana Admin',
    email: 'ana@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    joinedAt: '2026-01-01T00:00:00.000Z',
    suspendedAt: null,
    revokedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-08T12:00:00.000Z',
    allowedActions: ['CHANGE_ROLE', 'SUSPEND', 'REMOVE'],
    ...overrides,
  };
}

function createMutationResponse(
  overrides: Partial<{
    role: MembershipListItem['role'];
    status: MembershipListItem['status'];
  }> = {},
) {
  return {
    id: 'membership-a',
    userId: 'user-a',
    role: overrides.role ?? 'ADMIN',
    status: overrides.status ?? 'ACTIVE',
    updatedAt: '2026-08-08T12:01:00.000Z',
  };
}
