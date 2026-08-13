import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import {
  TENANT_HTTP_MODE,
  TENANT_ORGANIZATION_ID,
} from '../../../core/tenant-context/tenant-http-context';
import { OrganizationConfigurationService } from './organization-configuration.service';

describe('OrganizationConfigurationService', () => {
  let service: OrganizationConfigurationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrganizationConfigurationService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses tenant-required context and the certified settings request body', () => {
    service
      .updateSettings('organization-a', {
        defaultAppointmentDuration: null,
        expectedRowState: 'ABSENT',
      })
      .subscribe();
    const request = http.expectOne(`${environment.apiUrl}/organizations/organization-a/settings`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      defaultAppointmentDuration: null,
      expectedRowState: 'ABSENT',
    });
    expect(request.request.context.get(TENANT_HTTP_MODE)).toBe('TENANT_REQUIRED');
    expect(request.request.context.get(TENANT_ORGANIZATION_ID)).toBe('organization-a');
    request.flush({
      rowState: 'ABSENT',
      updatedAt: null,
      defaultAppointmentDuration: 60,
      persistedDefaultAppointmentDuration: null,
    });
  });

  it('uses the certified branding endpoint and present-row precondition', () => {
    service
      .updateBranding('organization-a', {
        primaryColor: '#2563EB',
        expectedUpdatedAt: '2026-08-13T00:00:00.000Z',
      })
      .subscribe();
    const request = http.expectOne(`${environment.apiUrl}/organizations/organization-a/branding`);
    expect(request.request.body).toEqual({
      primaryColor: '#2563EB',
      expectedUpdatedAt: '2026-08-13T00:00:00.000Z',
    });
    request.flush({
      rowState: 'PRESENT',
      updatedAt: '2026-08-13T00:00:01.000Z',
      primaryColor: '#2563EB',
    });
  });
});
