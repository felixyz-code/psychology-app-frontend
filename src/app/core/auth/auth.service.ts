import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { from, map, Observable, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { TENANT_HTTP_MODE } from '../tenant-context/tenant-http-context';
import {
  FreelancerBootstrapRequest,
  FreelancerBootstrapResponse,
  LoginRequest,
  LoginResponse,
} from './auth.models';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly tenantContextStore = inject(TenantContextStore);
  private readonly apiUrl = environment.apiUrl;

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const context = new HttpContext().set(TENANT_HTTP_MODE, 'PUBLIC');

    return this.http
      .post<LoginResponse>(this.apiUrl + '/auth/login', credentials, { context })
      .pipe(
        switchMap((response) => {
          this.authStore.setSession(response.accessToken, response.user);
          return from(this.tenantContextStore.startForIdentity(response.user.id)).pipe(
            map(() => response),
          );
        }),
      );
  }

  freelancerBootstrap(
    request: FreelancerBootstrapRequest,
  ): Observable<FreelancerBootstrapResponse> {
    const context = new HttpContext().set(TENANT_HTTP_MODE, 'PUBLIC');
    const body: FreelancerBootstrapRequest = {
      email: request.email,
      password: request.password,
      name: request.name,
      organizationName: request.organizationName,
    };

    return this.http
      .post<FreelancerBootstrapResponse>(this.apiUrl + '/auth/freelancer-bootstrap', body, {
        context,
      })
      .pipe(
        map((response) => {
          if (!isValidBootstrapResponse(response)) {
            throw new Error('The freelancer bootstrap response is invalid.');
          }

          return response;
        }),
        switchMap((response) => {
          this.authStore.setSession(response.accessToken, response.user);
          return from(this.tenantContextStore.startForIdentity(response.user.id)).pipe(
            map(() => response),
          );
        }),
      );
  }

  logout(): void {
    this.tenantContextStore.resetTenantState('logout');
    this.authStore.clearSession();
  }
}

function isValidBootstrapResponse(response: unknown): response is FreelancerBootstrapResponse {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const candidate = response as Partial<FreelancerBootstrapResponse>;
  const user = candidate.user;
  const organization = candidate.organization;
  const membership = candidate.membership;

  return (
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.trim().length > 0 &&
    !!user &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    user.role === 'PSYCHOLOGIST' &&
    !!organization &&
    typeof organization.id === 'string' &&
    organization.id.trim().length > 0 &&
    organization.status === 'ACTIVE' &&
    !!membership &&
    typeof membership.id === 'string' &&
    membership.id.trim().length > 0 &&
    membership.userId === user.id &&
    membership.organizationId === organization.id &&
    membership.role === 'OWNER' &&
    membership.status === 'ACTIVE'
  );
}
