import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  TENANT_HTTP_MODE,
  TENANT_ORGANIZATION_ID,
} from '../../../core/tenant-context/tenant-http-context';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InvitationsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists invitations using the explicitly captured tenant context and sanitizes rows', () => {
    let value: unknown;
    service.list('organization/a').subscribe((response) => (value = response));
    const request = http.expectOne('/api/organizations/organization%2Fa/invitations');
    expect(request.request.method).toBe('GET');
    expectTenant(request.request.context, 'organization/a');
    request.flush([
      { ...invitation(), token: 'secret', tokenDigest: 'digest', invitedUserId: 'user-a' },
    ]);
    expect(value).toEqual([invitation()]);
    expect(JSON.stringify(value)).not.toContain('secret');
  });

  it('creates an invitation and discards all response properties', () => {
    let value: unknown = 'not-emitted';
    service
      .create('organization-a', { email: 'ana@example.com', role: 'ADMIN' })
      .subscribe((response) => (value = response));
    const request = http.expectOne('/api/organizations/organization-a/invitations');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@example.com', role: 'ADMIN' });
    expectTenant(request.request.context, 'organization-a');
    request.flush({
      ...invitation(),
      token: 'usable-token',
      normalizedEmail: 'ana@example.com',
      invitedUserId: 'user-a',
      acceptedByUserId: 'user-b',
    });
    expect(value).toBeUndefined();
  });

  it('accepts the real partial revoke response and exposes no payload', () => {
    let value: unknown = 'not-emitted';
    service.revoke('organization-a', 'invitation/a').subscribe((response) => (value = response));
    const request = http.expectOne(
      '/api/organizations/organization-a/invitations/invitation%2Fa/revoke',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expectTenant(request.request.context, 'organization-a');
    request.flush({
      id: 'invitation/a',
      logicalStatus: 'REVOKED',
      revokedAt: '2026-08-10T01:00:00.000Z',
    });
    expect(value).toBeUndefined();
  });

  it('discards a resend replacement response including its new id and sensitive extras', () => {
    let value: unknown = 'not-emitted';
    service.resend('organization-a', 'invitation/a').subscribe((response) => (value = response));
    const request = http.expectOne(
      '/api/organizations/organization-a/invitations/invitation%2Fa/resend',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expectTenant(request.request.context, 'organization-a');
    request.flush({
      ...invitation(),
      id: 'replacement-id',
      token: 'never-store',
      normalizedEmail: 'ana@example.com',
    });
    expect(value).toBeUndefined();
  });
});

function expectTenant(
  context: import('@angular/common/http').HttpContext,
  organizationId: string,
): void {
  expect(context.get(TENANT_HTTP_MODE)).toBe('TENANT_REQUIRED');
  expect(context.get(TENANT_ORGANIZATION_ID)).toBe(organizationId);
}
function invitation() {
  return {
    id: 'invitation-a',
    email: 'ana@example.com',
    role: 'ADMIN',
    logicalStatus: 'PENDING',
    expiresAt: '2026-08-12T00:00:00.000Z',
    acceptedAt: null,
    rejectedAt: null,
    revokedAt: null,
    expiredAt: null,
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
  };
}
