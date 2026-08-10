import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, Observable, Subscription } from 'rxjs';

import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import {
  StatusBadgeComponent,
  StatusBadgeVariant,
} from '../../../shared/components/status-badge/status-badge.component';
import {
  CreateInvitationDialogComponent,
  CreateInvitationDialogResult,
} from '../components/create-invitation-dialog.component';
import {
  InvitationConfirmationAction,
  InvitationConfirmDialogComponent,
} from '../components/invitation-confirm-dialog.component';
import { InvitationListItem, InvitationRole, InvitationStatus } from '../models/invitation.models';
import { InvitationsService } from '../services/invitations.service';

type ViewState = 'loading' | 'loaded' | 'empty' | 'forbidden' | 'tenant-context' | 'error';
type MutationKind = 'create' | 'revoke' | 'resend';
interface RequestScope {
  organizationId: string;
  generation: number;
}

@Component({
  selector: 'app-invitation-administration-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    SectionCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './invitation-administration.page.html',
  styleUrl: './invitation-administration.page.scss',
})
export class InvitationAdministrationPage implements OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly invitationsService = inject(InvitationsService);
  readonly tenantContextStore = inject(TenantContextStore);
  private loadSubscription?: Subscription;
  private mutationSubscription?: Subscription;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private loadSequence = 0;
  private destroyed = false;

  readonly viewState = signal<ViewState>('loading');
  readonly invitations = signal<InvitationListItem[]>([]);
  readonly isMutating = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly contextWarning = signal('');
  readonly now = signal(Date.now());
  readonly canCreate = computed(() => this.tenantContextStore.hasCapability('invitation.create'));

  constructor() {
    this.loadInvitations();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.loadSubscription?.unsubscribe();
    this.mutationSubscription?.unsubscribe();
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
  }

  loadInvitations(preserveFeedback = false): void {
    const scope = this.captureScope();
    const sequence = ++this.loadSequence;
    this.loadSubscription?.unsubscribe();
    this.viewState.set('loading');
    this.contextWarning.set('');
    if (!preserveFeedback) {
      this.successMessage.set('');
      this.errorMessage.set('');
    }

    if (
      !scope ||
      !this.tenantContextStore.isActiveTenantReady() ||
      !this.tenantContextStore.hasCapability('invitation.read')
    ) {
      this.invitations.set([]);
      this.viewState.set('forbidden');
      return;
    }

    this.loadSubscription = this.invitationsService.list(scope.organizationId).subscribe({
      next: (items) => {
        if (sequence !== this.loadSequence || !this.isScopeCurrent(scope)) return;
        this.invitations.set(items);
        this.now.set(Date.now());
        this.scheduleExpiryClock();
        this.viewState.set(items.length ? 'loaded' : 'empty');
      },
      error: (error: HttpErrorResponse) => {
        if (sequence !== this.loadSequence || !this.isScopeCurrent(scope)) return;
        this.invitations.set([]);
        const code = this.errorCode(error);
        this.viewState.set(
          error.status === 403
            ? 'forbidden'
            : code === 'TENANT_CONTEXT_REQUIRED'
              ? 'tenant-context'
              : 'error',
        );
        if (code === 'TENANT_CONTEXT_REQUIRED') {
          this.contextWarning.set(
            'El contexto de la organización necesita actualizarse. Reintenta para recuperar la información.',
          );
          void this.tenantContextStore.refreshContext();
        }
      },
    });
  }

  retry(): void {
    this.loadInvitations();
  }

  openCreateDialog(): void {
    if (!this.canCreate() || this.isMutating()) return;
    const scope = this.captureScope();
    if (!scope) return;
    const ref = this.dialog.open(CreateInvitationDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: 'first-tabbable',
    });
    ref.afterClosed().subscribe((result: CreateInvitationDialogResult | undefined) => {
      if (result && this.isScopeCurrent(scope)) this.createInvitation(scope, result);
    });
  }

  openConfirmation(invitation: InvitationListItem, action: InvitationConfirmationAction): void {
    if (
      this.isMutating() ||
      (action === 'REVOKE' ? !this.canRevoke(invitation) : !this.canResend(invitation))
    )
      return;
    const scope = this.captureScope();
    if (!scope) return;
    const ref = this.dialog.open(InvitationConfirmDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: 'first-tabbable',
      data: { action, invitation },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed || !this.isScopeCurrent(scope)) return;
      const request =
        action === 'REVOKE'
          ? this.invitationsService.revoke(scope.organizationId, invitation.id)
          : this.invitationsService.resend(scope.organizationId, invitation.id);
      this.runMutation(scope, request, action === 'REVOKE' ? 'revoke' : 'resend');
    });
  }

  effectiveStatus(invitation: InvitationListItem): InvitationStatus {
    if (invitation.logicalStatus === 'PENDING') {
      const expiresAt = new Date(invitation.expiresAt).getTime();
      if (Number.isFinite(expiresAt) && this.now() >= expiresAt) return 'EXPIRED';
    }
    return invitation.logicalStatus;
  }

  canRevoke(invitation: InvitationListItem): boolean {
    return (
      this.tenantContextStore.hasCapability('invitation.revoke') &&
      this.effectiveStatus(invitation) === 'PENDING'
    );
  }

  canResend(invitation: InvitationListItem): boolean {
    const status = this.effectiveStatus(invitation);
    return (
      this.tenantContextStore.hasCapability('invitation.resend') &&
      (status === 'PENDING' || status === 'EXPIRED')
    );
  }

  roleLabel(role: InvitationRole): string {
    return ROLE_LABELS[role];
  }
  statusLabel(status: InvitationStatus): string {
    return STATUS_LABELS[status];
  }
  statusVariant(status: InvitationStatus): StatusBadgeVariant {
    return STATUS_VARIANTS[status];
  }
  dateLabel(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date);
  }
  relevantDate(invitation: InvitationListItem): string | null {
    const status = this.effectiveStatus(invitation);
    if (status === 'ACCEPTED') return invitation.acceptedAt;
    if (status === 'REJECTED') return invitation.rejectedAt;
    if (status === 'REVOKED') return invitation.revokedAt;
    if (status === 'EXPIRED') return invitation.expiredAt ?? invitation.expiresAt;
    return invitation.expiresAt;
  }
  relevantDateLabel(invitation: InvitationListItem): string {
    return this.effectiveStatus(invitation) === 'PENDING' ? 'Vence' : 'Fecha de cierre';
  }

  private createInvitation(scope: RequestScope, result: CreateInvitationDialogResult): void {
    if (this.isMutating() || !this.canCreate()) return;
    this.runMutation(scope, this.invitationsService.create(scope.organizationId, result), 'create');
  }

  private runMutation(
    scope: RequestScope,
    request: Observable<InvitationListItem>,
    kind: MutationKind,
  ): void {
    if (this.isMutating()) return;
    this.isMutating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.mutationSubscription?.unsubscribe();
    this.mutationSubscription = request
      .pipe(
        finalize(() => {
          if (!this.isScopeCurrent(scope)) this.isMutating.set(false);
        }),
      )
      .subscribe({
        next: () => {
          if (!this.isScopeCurrent(scope)) {
            this.isMutating.set(false);
            return;
          }
          this.isMutating.set(false);
          this.successMessage.set(
            kind === 'create'
              ? 'La invitación fue creada.'
              : kind === 'revoke'
                ? 'La invitación fue revocada.'
                : 'Se creó una nueva invitación de reemplazo.',
          );
          this.loadInvitations(true);
        },
        error: (error: HttpErrorResponse) => {
          if (!this.isScopeCurrent(scope)) return;
          this.isMutating.set(false);
          this.handleMutationError(error, scope, kind);
        },
      });
  }

  private handleMutationError(
    error: HttpErrorResponse,
    scope: RequestScope,
    kind: MutationKind,
  ): void {
    const code = this.errorCode(error);
    const canonicalRefreshRequired =
      error.status === 0 ||
      error.status === 404 ||
      error.status === 409 ||
      code === 'CONFLICT' ||
      code === 'CONCURRENT_UPDATE';
    if (canonicalRefreshRequired) {
      this.loadInvitations(true);
      this.errorMessage.set(
        error.status === 0
          ? kind === 'resend'
            ? 'No se confirmó el reenvío. La lista se actualizó antes de permitir otra acción; no se reintentó automáticamente.'
            : 'No se confirmó la operación. La lista se actualizó antes de permitir un nuevo intento.'
          : 'La invitación cambió o ya no está disponible. Se actualizó la lista canónica.',
      );
      return;
    }
    if (code === 'TENANT_CONTEXT_REQUIRED') {
      this.contextWarning.set(
        'La sesión de la organización necesita actualizarse. Confirma la operación de nuevo después de la recarga.',
      );
      void this.tenantContextStore.refreshContext().then(() => {
        if (this.isScopeCurrent(scope)) this.loadInvitations(true);
      });
      return;
    }
    this.errorMessage.set(
      error.status === 403
        ? 'El servidor rechazó esta acción. Tus permisos pudieron haber cambiado.'
        : 'No fue posible completar la operación. Intenta de nuevo.',
    );
  }

  private scheduleExpiryClock(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    const current = Date.now();
    const next = this.invitations()
      .filter((item) => item.logicalStatus === 'PENDING')
      .map((item) => new Date(item.expiresAt).getTime())
      .filter((value) => Number.isFinite(value) && value > current)
      .sort((a, b) => a - b)[0];
    if (!next) return;
    this.expiryTimer = setTimeout(
      () => {
        this.now.set(Date.now());
        this.scheduleExpiryClock();
      },
      Math.min(Math.max(next - current, 250), 60_000),
    );
  }

  private captureScope(): RequestScope | null {
    const organizationId = this.tenantContextStore.selectedOrganizationId();
    return organizationId
      ? { organizationId, generation: this.tenantContextStore.switchGeneration() }
      : null;
  }
  private isScopeCurrent(scope: RequestScope): boolean {
    return (
      !this.destroyed &&
      this.tenantContextStore.isActiveTenantReady() &&
      this.tenantContextStore.selectedOrganizationId() === scope.organizationId &&
      this.tenantContextStore.switchGeneration() === scope.generation
    );
  }
  private errorCode(error: HttpErrorResponse): string | null {
    return error.error && typeof error.error === 'object' && typeof error.error.code === 'string'
      ? error.error.code
      : null;
  }
}

const ROLE_LABELS: Record<InvitationRole, string> = {
  ADMIN: 'Administrador',
  PSYCHOLOGIST: 'Psicólogo',
  RECEPTIONIST: 'Recepcionista',
  BILLING: 'Facturación',
  AUDITOR: 'Auditor',
  READ_ONLY: 'Solo lectura',
};
const STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  REVOKED: 'Revocada',
  EXPIRED: 'Expirada',
};
const STATUS_VARIANTS: Record<InvitationStatus, StatusBadgeVariant> = {
  PENDING: 'primary',
  ACCEPTED: 'success',
  REJECTED: 'warning',
  REVOKED: 'danger',
  EXPIRED: 'neutral',
};
const DATE_FORMATTER = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
