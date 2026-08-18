import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  TENANT_HTTP_MODE,
  TENANT_ORGANIZATION_ID,
} from '../../../core/tenant-context/tenant-http-context';
import {
  ChangeOrganizationStatusDto,
  OrganizationDetails,
  UpdateOrganizationDto,
} from '../models/organization.models';

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/organizations`;

  getCurrent(organizationId: string): Observable<OrganizationDetails> {
    return this.http.get<OrganizationDetails>(`${this.basePath}/current`, {
      context: this.tenantContext(organizationId),
    });
  }

  update(organizationId: string, payload: UpdateOrganizationDto): Observable<OrganizationDetails> {
    return this.http.patch<OrganizationDetails>(
      `${this.basePath}/${encodeURIComponent(organizationId)}`,
      payload,
      { context: this.tenantContext(organizationId) },
    );
  }

  changeStatus(
    organizationId: string,
    payload: ChangeOrganizationStatusDto,
  ): Observable<OrganizationDetails> {
    return this.http.patch<OrganizationDetails>(
      `${this.basePath}/${encodeURIComponent(organizationId)}/status`,
      payload,
      { context: this.tenantContext(organizationId) },
    );
  }

  private tenantContext(organizationId: string): HttpContext {
    return new HttpContext()
      .set(TENANT_HTTP_MODE, 'TENANT_REQUIRED')
      .set(TENANT_ORGANIZATION_ID, organizationId);
  }
}
