import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  TENANT_HTTP_MODE,
  TENANT_ORGANIZATION_ID,
} from '../../../core/tenant-context/tenant-http-context';
import {
  OrganizationLogoResponse,
  OrganizationLogoUploadPrecondition,
} from '../models/organization-logo.models';

@Injectable({ providedIn: 'root' })
export class OrganizationLogoService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/organizations`;

  getMetadata(organizationId: string): Observable<OrganizationLogoResponse> {
    return this.http.get<OrganizationLogoResponse>(this.path(organizationId), {
      context: this.context(organizationId),
    });
  }

  getContent(organizationId: string): Observable<Blob> {
    return this.http.get(`${this.path(organizationId)}/content`, {
      context: this.context(organizationId),
      responseType: 'blob',
    });
  }

  upload(
    organizationId: string,
    file: File,
    precondition: OrganizationLogoUploadPrecondition,
  ): Observable<OrganizationLogoResponse> {
    const body = new FormData();
    body.append('file', file);
    if ('expectedRowState' in precondition) {
      body.append('expectedRowState', precondition.expectedRowState);
    } else {
      body.append('expectedUpdatedAt', precondition.expectedUpdatedAt);
    }

    return this.http.put<OrganizationLogoResponse>(this.path(organizationId), body, {
      context: this.context(organizationId),
    });
  }

  remove(organizationId: string, expectedUpdatedAt: string): Observable<OrganizationLogoResponse> {
    return this.http.delete<OrganizationLogoResponse>(this.path(organizationId), {
      body: { expectedUpdatedAt },
      context: this.context(organizationId),
    });
  }

  private path(organizationId: string): string {
    return `${this.basePath}/${encodeURIComponent(organizationId)}/logo`;
  }

  private context(organizationId: string): HttpContext {
    return new HttpContext()
      .set(TENANT_HTTP_MODE, 'TENANT_REQUIRED')
      .set(TENANT_ORGANIZATION_ID, organizationId);
  }
}
