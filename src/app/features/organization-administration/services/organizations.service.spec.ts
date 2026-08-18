import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  TENANT_HTTP_MODE,
  TENANT_ORGANIZATION_ID,
} from '../../../core/tenant-context/tenant-http-context';
import { OrganizationDetails } from '../models/organization.models';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(OrganizationsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads the current organization in the explicitly captured tenant context', () => {
    service.getCurrent('organization-a').subscribe();

    const request = httpTesting.expectOne('/api/organizations/current');
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(TENANT_HTTP_MODE)).toBe('TENANT_REQUIRED');
    expect(request.request.context.get(TENANT_ORGANIZATION_ID)).toBe('organization-a');
    request.flush(createOrganization());
  });

  it('patches only the supplied identity fields in the captured tenant context', () => {
    service.update('organization-a', { displayName: 'Canonical name' }).subscribe();

    const request = httpTesting.expectOne('/api/organizations/organization-a');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ displayName: 'Canonical name' });
    expect(request.request.context.get(TENANT_ORGANIZATION_ID)).toBe('organization-a');
    request.flush(createOrganization({ displayName: 'Canonical name' }));
  });

  it('uses the dedicated lifecycle endpoint', () => {
    service.changeStatus('organization-a', { status: 'SUSPENDED' }).subscribe();

    const request = httpTesting.expectOne('/api/organizations/organization-a/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'SUSPENDED' });
    expect(request.request.context.get(TENANT_ORGANIZATION_ID)).toBe('organization-a');
    request.flush(createOrganization({ status: 'SUSPENDED' }));
  });
});

function createOrganization(overrides: Partial<OrganizationDetails> = {}): OrganizationDetails {
  return {
    id: 'organization-a',
    slug: 'practice-a',
    legalName: 'Practice A, S.C.',
    displayName: 'Practice A',
    status: 'ACTIVE',
    timezone: 'America/Hermosillo',
    locale: 'es-MX',
    currency: 'MXN',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}
