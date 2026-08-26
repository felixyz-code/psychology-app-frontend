import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TENANT_HTTP_MODE } from '../../../core/tenant-context/tenant-http-context';
import {
  AdminTenantItem,
  ExtendTrialPayload,
  FreezeTenantPayload,
  FreezeTenantResponse,
  GrantLifetimePayload,
  UpdateQuotasPayload,
} from '../models/superadmin.models';

@Injectable({ providedIn: 'root' })
export class SuperadminTenantsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/tenants`;

  private readonly identityContext = new HttpContext().set(
    TENANT_HTTP_MODE,
    'IDENTITY_ONLY',
  );

  listTenants(): Observable<AdminTenantItem[]> {
    return this.http.get<AdminTenantItem[]>(this.baseUrl, {
      context: this.identityContext,
    });
  }

  extendTrial(
    organizationId: string,
    payload: ExtendTrialPayload,
  ): Observable<unknown> {
    return this.http.post(
      `${this.baseUrl}/${encodeURIComponent(organizationId)}/extend-trial`,
      payload,
      { context: this.identityContext },
    );
  }

  grantLifetime(
    organizationId: string,
    payload: GrantLifetimePayload,
  ): Observable<unknown> {
    return this.http.post(
      `${this.baseUrl}/${encodeURIComponent(organizationId)}/grant-lifetime`,
      payload,
      { context: this.identityContext },
    );
  }

  updateQuotas(
    organizationId: string,
    payload: UpdateQuotasPayload,
  ): Observable<unknown> {
    return this.http.patch(
      `${this.baseUrl}/${encodeURIComponent(organizationId)}/quotas`,
      payload,
      { context: this.identityContext },
    );
  }

  freezeTenant(
    organizationId: string,
    payload: FreezeTenantPayload,
  ): Observable<FreezeTenantResponse> {
    return this.http.post<FreezeTenantResponse>(
      `${this.baseUrl}/${encodeURIComponent(organizationId)}/freeze`,
      payload,
      { context: this.identityContext },
    );
  }
}
