import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  TENANT_HTTP_MODE,
  TENANT_ORGANIZATION_ID,
} from '../../../core/tenant-context/tenant-http-context';
import {
  ChangeMembershipRoleDto,
  ChangeMembershipStatusDto,
  MembershipListItem,
  MembershipMutationPreconditionDto,
  MembershipMutationResponse,
} from '../models/membership.models';

@Injectable({ providedIn: 'root' })
export class MembershipsService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/organizations`;

  list(organizationId: string): Observable<MembershipListItem[]> {
    return this.http.get<MembershipListItem[]>(
      `${this.basePath}/${encodeURIComponent(organizationId)}/memberships`,
      {
        context: this.tenantContext(organizationId),
      },
    );
  }

  changeRole(
    organizationId: string,
    membershipId: string,
    payload: ChangeMembershipRoleDto,
  ): Observable<MembershipMutationResponse> {
    return this.http.patch<MembershipMutationResponse>(
      `${this.membershipPath(organizationId, membershipId)}/role`,
      payload,
      {
        context: this.tenantContext(organizationId),
      },
    );
  }

  changeStatus(
    organizationId: string,
    membershipId: string,
    payload: ChangeMembershipStatusDto,
  ): Observable<MembershipMutationResponse> {
    return this.http.patch<MembershipMutationResponse>(
      `${this.membershipPath(organizationId, membershipId)}/status`,
      payload,
      {
        context: this.tenantContext(organizationId),
      },
    );
  }

  remove(
    organizationId: string,
    membershipId: string,
    payload: MembershipMutationPreconditionDto,
  ): Observable<MembershipMutationResponse> {
    return this.http.delete<MembershipMutationResponse>(
      this.membershipPath(organizationId, membershipId),
      {
        body: payload,
        context: this.tenantContext(organizationId),
      },
    );
  }

  leave(
    organizationId: string,
    payload: MembershipMutationPreconditionDto,
  ): Observable<MembershipMutationResponse> {
    return this.http.post<MembershipMutationResponse>(
      `${this.basePath}/${encodeURIComponent(organizationId)}/memberships/leave`,
      payload,
      {
        context: this.tenantContext(organizationId),
      },
    );
  }

  private membershipPath(organizationId: string, membershipId: string): string {
    return (
      `${this.basePath}/${encodeURIComponent(organizationId)}` +
      `/memberships/${encodeURIComponent(membershipId)}`
    );
  }

  private tenantContext(organizationId: string): HttpContext {
    return new HttpContext()
      .set(TENANT_HTTP_MODE, 'TENANT_REQUIRED')
      .set(TENANT_ORGANIZATION_ID, organizationId);
  }
}
