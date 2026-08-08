import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthContextPreferenceResponse, AuthContextResponseV1 } from './tenant-context.models';
import { TENANT_HTTP_MODE, TENANT_ORGANIZATION_ID } from './tenant-http-context';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getContext(organizationId: string | null = null): Observable<AuthContextResponseV1> {
    let context = new HttpContext().set(TENANT_HTTP_MODE, 'TENANT_OPTIONAL');

    if (organizationId) {
      context = context.set(TENANT_ORGANIZATION_ID, organizationId);
    }

    const headers = organizationId
      ? new HttpHeaders({ 'X-Organization-Id': organizationId })
      : undefined;

    return this.http.get<AuthContextResponseV1>(this.apiUrl + '/auth/context', {
      context,
      headers,
    });
  }

  updatePreferredOrganization(
    organizationId: string | null,
  ): Observable<AuthContextPreferenceResponse> {
    const context = new HttpContext().set(TENANT_HTTP_MODE, 'IDENTITY_ONLY');

    return this.http.put<AuthContextPreferenceResponse>(
      this.apiUrl + '/auth/context/preference',
      { organizationId },
      { context },
    );
  }
}
