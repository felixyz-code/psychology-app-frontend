import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  TENANT_HTTP_MODE,
  TENANT_ORGANIZATION_ID,
} from '../../../core/tenant-context/tenant-http-context';
import { CreateInvitationDto, InvitationListItem } from '../models/invitation.models';

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/organizations`;

  list(organizationId: string): Observable<InvitationListItem[]> {
    return this.http
      .get<unknown[]>(this.invitationsPath(organizationId), {
        context: this.tenantContext(organizationId),
      })
      .pipe(map((items) => items.map(sanitizeInvitation)));
  }

  create(organizationId: string, payload: CreateInvitationDto): Observable<InvitationListItem> {
    return this.http
      .post<unknown>(this.invitationsPath(organizationId), payload, {
        context: this.tenantContext(organizationId),
      })
      .pipe(map(sanitizeInvitation));
  }

  revoke(organizationId: string, invitationId: string): Observable<InvitationListItem> {
    return this.http
      .post<unknown>(
        `${this.invitationPath(organizationId, invitationId)}/revoke`,
        {},
        {
          context: this.tenantContext(organizationId),
        },
      )
      .pipe(map(sanitizeInvitation));
  }

  resend(organizationId: string, invitationId: string): Observable<InvitationListItem> {
    return this.http
      .post<unknown>(
        `${this.invitationPath(organizationId, invitationId)}/resend`,
        {},
        {
          context: this.tenantContext(organizationId),
        },
      )
      .pipe(map(sanitizeInvitation));
  }

  private invitationsPath(organizationId: string): string {
    return `${this.basePath}/${encodeURIComponent(organizationId)}/invitations`;
  }

  private invitationPath(organizationId: string, invitationId: string): string {
    return `${this.invitationsPath(organizationId)}/${encodeURIComponent(invitationId)}`;
  }

  private tenantContext(organizationId: string): HttpContext {
    return new HttpContext()
      .set(TENANT_HTTP_MODE, 'TENANT_REQUIRED')
      .set(TENANT_ORGANIZATION_ID, organizationId);
  }
}

function sanitizeInvitation(value: unknown): InvitationListItem {
  const item = value as Record<string, unknown>;
  return {
    id: String(item['id'] ?? ''),
    email: String(item['email'] ?? ''),
    role: item['role'] as InvitationListItem['role'],
    logicalStatus: item['logicalStatus'] as InvitationListItem['logicalStatus'],
    expiresAt: String(item['expiresAt'] ?? ''),
    acceptedAt: nullableString(item['acceptedAt']),
    rejectedAt: nullableString(item['rejectedAt']),
    revokedAt: nullableString(item['revokedAt']),
    expiredAt: nullableString(item['expiredAt']),
    createdAt: String(item['createdAt'] ?? ''),
    updatedAt: String(item['updatedAt'] ?? ''),
  };
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
