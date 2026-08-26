import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { SuperadminTenantsService } from './superadmin-tenants.service';

describe('SuperadminTenantsService', () => {
  let service: SuperadminTenantsService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/admin/tenants`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SuperadminTenantsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(SuperadminTenantsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('queries list of tenants', () => {
    service.listTenants().subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('posts extend-trial payload', () => {
    service.extendTrial('org-123', { daysToAdd: 14 }).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/org-123/extend-trial`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ daysToAdd: 14 });
    req.flush({});
  });

  it('posts grant-lifetime payload', () => {
    service
      .grantLifetime('org-123', {
        sponsorNotes: 'Fundación Aliada',
        customTherapistsLimit: 10,
      })
      .subscribe();

    const req = httpMock.expectOne(`${baseUrl}/org-123/grant-lifetime`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      sponsorNotes: 'Fundación Aliada',
      customTherapistsLimit: 10,
    });
    req.flush({});
  });

  it('patches quotas payload', () => {
    service
      .updateQuotas('org-123', {
        customTherapistsLimit: 20,
        customPatientsLimit: 500,
      })
      .subscribe();

    const req = httpMock.expectOne(`${baseUrl}/org-123/quotas`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      customTherapistsLimit: 20,
      customPatientsLimit: 500,
    });
    req.flush({});
  });

  it('posts freeze payload', () => {
    service
      .freezeTenant('org-123', { freeze: true, reason: 'Test' })
      .subscribe();

    const req = httpMock.expectOne(`${baseUrl}/org-123/freeze`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ freeze: true, reason: 'Test' });
    req.flush({ success: true, isFrozen: true, message: 'Frozen' });
  });

  it('queries platform metrics', () => {
    service.getPlatformMetrics().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/metrics`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'HEALTHY' });
  });
});
