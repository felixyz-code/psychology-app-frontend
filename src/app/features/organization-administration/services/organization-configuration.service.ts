import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  TENANT_HTTP_MODE,
  TENANT_ORGANIZATION_ID,
} from '../../../core/tenant-context/tenant-http-context';
import {
  OrganizationBrandingResponse,
  OrganizationBrandingUpdateRequest,
  OrganizationSettingsResponse,
  OrganizationSettingsUpdateRequest,
} from '../models/organization-configuration.models';

@Injectable({ providedIn: 'root' })
export class OrganizationConfigurationService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/organizations`;

  getSettings(organizationId: string): Observable<OrganizationSettingsResponse> {
    return this.http.get<OrganizationSettingsResponse>(`${this.path(organizationId)}/settings`, {
      context: this.context(organizationId),
    });
  }

  updateSettings(
    organizationId: string,
    request: OrganizationSettingsUpdateRequest,
  ): Observable<OrganizationSettingsResponse> {
    return this.http.patch<OrganizationSettingsResponse>(
      `${this.path(organizationId)}/settings`,
      request,
      { context: this.context(organizationId) },
    );
  }

  getBranding(organizationId: string): Observable<OrganizationBrandingResponse> {
    return this.http.get<OrganizationBrandingResponse>(`${this.path(organizationId)}/branding`, {
      context: this.context(organizationId),
    });
  }

  updateBranding(
    organizationId: string,
    request: OrganizationBrandingUpdateRequest,
  ): Observable<OrganizationBrandingResponse> {
    return this.http.patch<OrganizationBrandingResponse>(
      `${this.path(organizationId)}/branding`,
      request,
      { context: this.context(organizationId) },
    );
  }

  private path(organizationId: string): string {
    return `${this.basePath}/${encodeURIComponent(organizationId)}`;
  }
  private context(organizationId: string): HttpContext {
    return new HttpContext()
      .set(TENANT_HTTP_MODE, 'TENANT_REQUIRED')
      .set(TENANT_ORGANIZATION_ID, organizationId);
  }
}
