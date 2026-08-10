import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, finalize, Subscription } from 'rxjs';

import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import {
  StatusBadgeComponent,
  StatusBadgeVariant,
} from '../../../shared/components/status-badge/status-badge.component';
import {
  MembershipConfirmationAction,
  MembershipConfirmDialogComponent,
} from '../components/membership-confirm-dialog.component';
import {
  MembershipRoleDialogComponent,
  MembershipRoleDialogResult,
} from '../components/membership-role-dialog.component';
import {
  AssignableMembershipRole,
  MembershipAllowedAction,
  MembershipListItem,
  MembershipMutationResponse,
  MembershipRole,
  MembershipStatus,
} from '../models/membership.models';
import { MembershipsService } from '../services/memberships.service';

type ViewState = 'loading' | 'loaded' | 'empty' | 'forbidden' | 'tenant-context' | 'error';
interface RequestScope {
  organizationId: string;
  generation: number;
}

@Component({
  selector: 'app-membership-administration-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    SectionCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './membership-administration.page.html',
  styleUrl: './membership-administration.page.scss',
})
export class MembershipAdministrationPage implements OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly membershipsService = inject(MembershipsService);
  readonly tenantContextStore = inject(TenantContextStore);
  private loadSubscription?: Subscription;
  private mutationSubscription?: Subscription;
  private loadSequence = 0;
  private destroyed = false;

  readonly viewState = signal<ViewState>('loading');
  readonly memberships = signal<MembershipListItem[]>([]);
  readonly isMutating = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly contextWarning = signal('');
  readonly currentMembership = computed(() => {
    const currentId = this.tenantContextStore.snapshot()?.membership?.id;
    return currentId
      ? (this.memberships().find((membership) => membership.id === currentId) ?? null)
      : null;
  });
  readonly canLeave = computed(
    () =>
      this.tenantContextStore.capabilities().includes('membership.leave') &&
      this.currentMembership() !== null,
  );
  readonly membershipSummary = computed(() => ({
    total: this.memberships().length,
    active: this.memberships().filter((membership) => membership.status === 'ACTIVE').length,
    suspended: this.memberships().filter((membership) => membership.status === 'SUSPENDED').length,
  }));

  constructor() {
    this.loadMemberships();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.loadSubscription?.unsubscribe();
    this.mutationSubscription?.unsubscribe();
  }

  loadMemberships(preserveSuccessMessage = false): void {
    const scope = this.captureScope();
    const sequence = ++this.loadSequence;

    this.loadSubscription?.unsubscribe();
    this.viewState.set('loading');
    this.errorMessage.set('');
    this.contextWarning.set('');
    if (!preserveSuccessMessage) {
      this.successMessage.set('');
    }

    if (!scope || !this.tenantContextStore.hasCapability('membership.read')) {
      this.memberships.set([]);
      this.viewState.set('forbidden');
      return;
    }

    this.loadSubscription = this.membershipsService.list(scope.organizationId).subscribe({
      next: (memberships) => {
        if (sequence !== this.loadSequence || !this.isScopeCurrent(scope)) {
          return;
        }

        this.memberships.set(memberships);
        this.viewState.set(memberships.length ? 'loaded' : 'empty');
      },
      error: (error: HttpErrorResponse) => {
        if (sequence !== this.loadSequence || !this.isScopeCurrent(scope)) {
          return;
        }

        if (this.getErrorCode(error) === 'TENANT_CONTEXT_REQUIRED') {
          void this.tenantContextStore.refreshContext().then(() => {
            if (!this.destroyed && this.isScopeCurrent(scope)) {
              this.loadMemberships();
            }
          });
        }

        this.memberships.set([]);
        this.viewState.set(this.getLoadErrorState(error));
        if (this.getErrorCode(error) === 'TENANT_CONTEXT_REQUIRED') {
          this.contextWarning.set(
            'El contexto de la organización necesita actualizarse. Reintenta para recuperar la información.',
          );
        }
      },
    });
  }

  retry(): void {
    this.loadMemberships();
  }

  roleLabel(role: MembershipRole): string {
    return roleLabels[role];
  }

  statusLabel(status: MembershipStatus): string {
    return statusLabels[status];
  }

  statusVariant(status: MembershipStatus): StatusBadgeVariant {
    return statusVariants[status];
  }

  hasAllowedAction(membership: MembershipListItem, action: MembershipAllowedAction): boolean {
    return membership.allowedActions.includes(action);
  }

  hasSecondaryActions(membership: MembershipListItem): boolean {
    return membership.allowedActions.some((action) =>
      ['SUSPEND', 'REACTIVATE', 'REMOVE'].includes(action),
    );
  }

  joinedDateLabel(joinedAt: string | null): string {
    if (!joinedAt) {
      return '—';
    }

    const date = new Date(joinedAt);
    return Number.isNaN(date.getTime()) ? '—' : JOINED_DATE_FORMATTER.format(date);
  }

  openRoleDialog(membership: MembershipListItem): void {
    if (!this.hasAllowedAction(membership, 'CHANGE_ROLE') || this.isMutating()) {
      return;
    }

    const dialogRef = this.dialog.open(MembershipRoleDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { membership },
    });

    dialogRef.afterClosed().subscribe((result: MembershipRoleDialogResult | undefined) => {
      if (result) {
        this.changeRole(membership, result.role, result.expectedUpdatedAt);
      }
    });
  }

  openActionConfirmation(
    membership: MembershipListItem,
    action: MembershipConfirmationAction,
  ): void {
    const allowedAction = action === 'LEAVE' ? null : action;
    if (
      (allowedAction && !this.hasAllowedAction(membership, allowedAction)) ||
      (action === 'LEAVE' && !this.canLeave()) ||
      this.isMutating()
    ) {
      return;
    }

    const dialogRef = this.dialog.open(MembershipConfirmDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { action, membership },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      if (action === 'LEAVE') {
        this.leaveOrganization(membership);
      } else if (action === 'REMOVE') {
        this.removeMembership(membership);
      } else {
        this.changeStatus(membership, action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE');
      }
    });
  }

  private changeRole(
    membership: MembershipListItem,
    role: AssignableMembershipRole,
    expectedUpdatedAt: string,
  ): void {
    const scope = this.captureScope();
    if (!scope || !this.hasAllowedAction(membership, 'CHANGE_ROLE') || this.isMutating()) {
      return;
    }

    this.runMutation(
      scope,
      this.membershipsService.changeRole(scope.organizationId, membership.id, {
        role,
        expectedUpdatedAt,
      }),
      'El rol se actualizó. La lista se recargará con el estado canónico.',
    );
  }

  private changeStatus(membership: MembershipListItem, status: 'ACTIVE' | 'SUSPENDED'): void {
    const action: MembershipAllowedAction = status === 'ACTIVE' ? 'REACTIVATE' : 'SUSPEND';
    const scope = this.captureScope();
    if (!scope || !this.hasAllowedAction(membership, action) || this.isMutating()) {
      return;
    }

    this.runMutation(
      scope,
      this.membershipsService.changeStatus(scope.organizationId, membership.id, {
        status,
        expectedUpdatedAt: membership.updatedAt,
      }),
      status === 'ACTIVE' ? 'El miembro fue reactivado.' : 'El miembro fue suspendido.',
    );
  }

  private removeMembership(membership: MembershipListItem): void {
    const scope = this.captureScope();
    if (!scope || !this.hasAllowedAction(membership, 'REMOVE') || this.isMutating()) {
      return;
    }

    this.runMutation(
      scope,
      this.membershipsService.remove(scope.organizationId, membership.id, {
        expectedUpdatedAt: membership.updatedAt,
      }),
      'La membresía fue revocada.',
    );
  }

  private leaveOrganization(membership: MembershipListItem): void {
    const scope = this.captureScope();
    if (!scope || !this.canLeave() || this.isMutating()) {
      return;
    }

    this.isMutating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.mutationSubscription?.unsubscribe();
    this.mutationSubscription = this.membershipsService
      .leave(scope.organizationId, { expectedUpdatedAt: membership.updatedAt })
      .pipe(
        finalize(() => {
          if (!this.isScopeCurrent(scope)) {
            this.isMutating.set(false);
          }
        }),
      )
      .subscribe({
        next: () => {
          if (!this.isScopeCurrent(scope)) {
            this.isMutating.set(false);
            return;
          }

          void this.reconcileLeave(scope);
        },
        error: (error: HttpErrorResponse) => {
          if (!this.isScopeCurrent(scope)) {
            return;
          }

          this.isMutating.set(false);
          this.handleMutationError(error, scope);
        },
      });
  }

  private runMutation(
    scope: RequestScope,
    request: Observable<MembershipMutationResponse>,
    successMessage: string,
  ): void {
    this.isMutating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.mutationSubscription?.unsubscribe();
    this.mutationSubscription = request
      .pipe(
        finalize(() => {
          if (!this.isScopeCurrent(scope)) {
            this.isMutating.set(false);
          }
        }),
      )
      .subscribe({
        next: () => {
          if (!this.isScopeCurrent(scope)) {
            this.isMutating.set(false);
            return;
          }

          this.isMutating.set(false);
          this.successMessage.set(successMessage);
          this.loadMemberships(true);
        },
        error: (error: HttpErrorResponse) => {
          if (!this.isScopeCurrent(scope)) {
            return;
          }

          this.isMutating.set(false);
          this.handleMutationError(error, scope);
        },
      });
  }

  private async reconcileLeave(scope: RequestScope): Promise<void> {
    await this.tenantContextStore.refreshContext();

    if (this.destroyed || !this.isScopeCurrent(scope)) {
      return;
    }

    this.tenantContextStore.resetTenantState('membership-left', scope.generation + 1);
    this.isMutating.set(false);
  }

  private handleMutationError(error: HttpErrorResponse, scope: RequestScope): void {
    const code = this.getErrorCode(error);

    if (code === 'CONCURRENT_UPDATE') {
      this.loadMemberships();
      this.errorMessage.set(
        'La membresía cambió mientras trabajabas. Se actualizó la lista; revísala y confirma la operación de nuevo.',
      );
      return;
    }

    if (code === 'LAST_OWNER_PROTECTED') {
      this.errorMessage.set(
        'No se puede completar la operación porque la organización debe conservar al menos un propietario activo.',
      );
      return;
    }

    if (code === 'TENANT_CONTEXT_REQUIRED') {
      this.contextWarning.set(
        'La sesión de la organización necesita actualizarse. Se intentará recuperar el contexto; confirma la operación de nuevo.',
      );
      void this.tenantContextStore.refreshContext().then(() => {
        if (!this.destroyed && this.isScopeCurrent(scope)) {
          this.loadMemberships();
        }
      });
      return;
    }

    if (error.status === 403) {
      this.errorMessage.set(
        'El servidor rechazó esta acción. Tus permisos pudieron haber cambiado.',
      );
      return;
    }

    this.errorMessage.set('No fue posible completar la operación. Intenta de nuevo.');
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
      this.tenantContextStore.selectedOrganizationId() === scope.organizationId &&
      this.tenantContextStore.switchGeneration() === scope.generation
    );
  }

  private getLoadErrorState(error: HttpErrorResponse): ViewState {
    if (error.status === 403) {
      return 'forbidden';
    }
    if (this.getErrorCode(error) === 'TENANT_CONTEXT_REQUIRED') {
      return 'tenant-context';
    }
    return 'error';
  }

  private getErrorCode(error: HttpErrorResponse): string | null {
    const body = error.error;
    return body && typeof body === 'object' && typeof body.code === 'string' ? body.code : null;
  }
}

const roleLabels: Record<MembershipRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  PSYCHOLOGIST: 'Psicólogo',
  RECEPTIONIST: 'Recepcionista',
  BILLING: 'Facturación',
  AUDITOR: 'Auditor',
  READ_ONLY: 'Solo lectura',
};

const statusLabels: Record<MembershipStatus, string> = {
  INVITED: 'Invitado',
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  REVOKED: 'Revocado',
};

const statusVariants: Record<MembershipStatus, StatusBadgeVariant> = {
  INVITED: 'primary',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  REVOKED: 'danger',
};

const JOINED_DATE_FORMATTER = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
