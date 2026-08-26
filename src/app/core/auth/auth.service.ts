import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { defer, from, map, Observable, of, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { TENANT_HTTP_MODE } from '../tenant-context/tenant-http-context';
import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  FreelancerBootstrapRequest,
  FreelancerBootstrapResponse,
  LoginRequest,
  LoginResponse,
  RevokeOtherSessionsResponse,
  RevokeSessionResponse,
  UserSessionItem,
} from './auth.models';
import { AuthStore } from './auth.store';
import { tap } from 'rxjs/operators';

export class BootstrapSessionConflictError extends Error {
  readonly code = 'BOOTSTRAP_SESSION_CONFLICT';

  constructor(readonly mutationCommitted: boolean) {
    super('A newer authenticated session became active while signup was in progress.');
    this.name = 'BootstrapSessionConflictError';
  }
}

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
          this.authStore.setSession(
            response.accessToken,
            response.user,
            response.refreshToken,
          );
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
    const requestSessionVersion = this.authStore.sessionVersion();
    const body: FreelancerBootstrapRequest = {
      email: request.email,
      password: request.password,
      name: request.name,
      organizationName: request.organizationName,
    };

    return defer(() => {
      if (this.authStore.isAuthenticated()) {
        return throwError(() => new BootstrapSessionConflictError(false));
      }

      return this.http.post<FreelancerBootstrapResponse>(
        this.apiUrl + '/auth/freelancer-bootstrap',
        body,
        { context },
      );
    }).pipe(
      map((response) => {
        if (!isValidBootstrapResponse(response)) {
          throw new Error('The freelancer bootstrap response is invalid.');
        }

        return response;
      }),
      switchMap((response) => {
        if (
          this.authStore.isAuthenticated() ||
          this.authStore.sessionVersion() !== requestSessionVersion
        ) {
          return throwError(() => new BootstrapSessionConflictError(true));
        }

        this.authStore.setSession(
          response.accessToken,
          response.user,
          response.refreshToken,
        );
        const installedSessionVersion = this.authStore.sessionVersion();

        return from(this.tenantContextStore.startForIdentity(response.user.id)).pipe(
          switchMap(() =>
            this.authStore.sessionVersion() === installedSessionVersion &&
            this.authStore.user()?.id === response.user.id
              ? of(response)
              : throwError(() => new BootstrapSessionConflictError(true)),
          ),
        );
      }),
    );
  }

  refreshToken(): Observable<LoginResponse> {
    const currentRefreshToken = this.authStore.refreshToken();
    if (!currentRefreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const context = new HttpContext().set(TENANT_HTTP_MODE, 'PUBLIC');
    return this.http
      .post<LoginResponse>(
        this.apiUrl + '/auth/refresh',
        { refreshToken: currentRefreshToken },
        { context },
      )
      .pipe(
        tap((response) => {
          this.authStore.updateTokens(response.accessToken, response.refreshToken);
        }),
      );
  }

  listSessions(): Observable<UserSessionItem[]> {
    return this.http.get<UserSessionItem[]>(this.apiUrl + '/auth/sessions');
  }

  revokeSession(sessionId: string): Observable<RevokeSessionResponse> {
    return this.http.delete<RevokeSessionResponse>(
      this.apiUrl + '/auth/sessions/' + sessionId,
    );
  }

  revokeOtherSessions(): Observable<RevokeOtherSessionsResponse> {
    return this.http.post<RevokeOtherSessionsResponse>(
      this.apiUrl + '/auth/sessions/revoke-others',
      {},
    );
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    const context = new HttpContext().set(TENANT_HTTP_MODE, 'PUBLIC');
    const body: ForgotPasswordRequest = { email };

    return this.http.post<ForgotPasswordResponse>(
      this.apiUrl + '/auth/forgot-password',
      body,
      { context },
    );
  }

  logout(): void {
    this.http.post(this.apiUrl + '/auth/logout', {}).subscribe({
      next: () => {},
      error: () => {},
    });
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
    isBootstrapOrganization(organization) &&
    isBootstrapMembership(membership) &&
    membership.userId === user.id &&
    membership.organizationId === organization.id
  );
}

function isBootstrapOrganization(
  value: unknown,
): value is FreelancerBootstrapResponse['organization'] {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const organization = value as Record<string, unknown>;
  return (
    hasExactKeys(organization, [
      'id',
      'slug',
      'legalName',
      'displayName',
      'status',
      'timezone',
      'locale',
      'currency',
    ]) &&
    isNonEmptyString(organization['id']) &&
    isNonEmptyString(organization['slug']) &&
    isNonEmptyString(organization['legalName']) &&
    isNonEmptyString(organization['displayName']) &&
    organization['status'] === 'ACTIVE' &&
    isNonEmptyString(organization['timezone']) &&
    isNonEmptyString(organization['locale']) &&
    isNonEmptyString(organization['currency'])
  );
}

function isBootstrapMembership(value: unknown): value is FreelancerBootstrapResponse['membership'] {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const membership = value as Record<string, unknown>;
  return (
    hasExactKeys(membership, ['id', 'organizationId', 'userId', 'role', 'status', 'joinedAt']) &&
    isNonEmptyString(membership['id']) &&
    isNonEmptyString(membership['organizationId']) &&
    isNonEmptyString(membership['userId']) &&
    membership['role'] === 'OWNER' &&
    membership['status'] === 'ACTIVE' &&
    isNonEmptyString(membership['joinedAt'])
  );
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(record).sort();
  const expectedKeys = [...keys].sort();

  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index])
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
