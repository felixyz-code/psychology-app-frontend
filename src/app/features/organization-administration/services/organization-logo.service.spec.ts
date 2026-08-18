import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import {
  TENANT_HTTP_MODE,
  TENANT_ORGANIZATION_ID,
} from '../../../core/tenant-context/tenant-http-context';
import { OrganizationLogoService } from './organization-logo.service';

describe('OrganizationLogoService', () => {
  let service: OrganizationLogoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OrganizationLogoService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrganizationLogoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets protected metadata through the tenant-required request context', () => {
    service.getMetadata('organization a').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/organizations/organization%20a/logo`);
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(TENANT_HTTP_MODE)).toBe('TENANT_REQUIRED');
    expect(request.request.context.get(TENANT_ORGANIZATION_ID)).toBe('organization a');
    request.flush(absentLogo());
  });

  it('gets protected content as a Blob through the authenticated pipeline', () => {
    service.getContent('organization-a').subscribe();

    const request = http.expectOne(
      `${environment.apiUrl}/organizations/organization-a/logo/content`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    expect(request.request.context.get(TENANT_HTTP_MODE)).toBe('TENANT_REQUIRED');
    request.flush(new Blob(['png'], { type: 'image/png' }));
  });

  it('uploads an ABSENT logo with only file and expectedRowState', () => {
    const file = new File(['png'], 'logo.png', { type: 'image/png' });
    service.upload('organization-a', file, { expectedRowState: 'ABSENT' }).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/organizations/organization-a/logo`);
    const body = request.request.body as FormData;
    expect(request.request.method).toBe('PUT');
    expect(body.get('file')).toBe(file);
    expect(body.get('expectedRowState')).toBe('ABSENT');
    expect(body.has('expectedUpdatedAt')).toBe(false);
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush(presentLogo());
  });

  it('uploads a PRESENT logo with only file and expectedUpdatedAt', () => {
    const file = new File(['jpeg'], 'logo.jpg', { type: 'image/jpeg' });
    service
      .upload('organization-a', file, { expectedUpdatedAt: '2026-08-13T00:00:00.000Z' })
      .subscribe();

    const request = http.expectOne(`${environment.apiUrl}/organizations/organization-a/logo`);
    const body = request.request.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('expectedUpdatedAt')).toBe('2026-08-13T00:00:00.000Z');
    expect(body.has('expectedRowState')).toBe(false);
    request.flush(presentLogo());
  });

  it('removes a PRESENT logo with expectedUpdatedAt in the JSON body', () => {
    service.remove('organization-a', '2026-08-13T00:00:00.000Z').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/organizations/organization-a/logo`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ expectedUpdatedAt: '2026-08-13T00:00:00.000Z' });
    expect(request.request.params.keys()).toEqual([]);
    request.flush(absentLogo());
  });
});

function absentLogo() {
  return {
    rowState: 'ABSENT',
    updatedAt: null,
    mimeType: null,
    byteSize: null,
    width: null,
    height: null,
  };
}

function presentLogo() {
  return {
    rowState: 'PRESENT',
    updatedAt: '2026-08-13T00:00:00.000Z',
    mimeType: 'image/png',
    byteSize: 3,
    width: 64,
    height: 64,
  };
}
