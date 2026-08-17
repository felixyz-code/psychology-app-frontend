import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, finalize, Subscription } from 'rxjs';

import { TenantAuthorityChangeService } from '../../../core/tenant-context/tenant-authority-change.service';
import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { TenantStateInvalidationCoordinator } from '../../../core/tenant-context/tenant-state-invalidation.coordinator';
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
  OwnershipTransferConfirmDialogComponent,
  OwnershipTransferConfirmDialogData,
} from '../components/ownership-transfer-confirm-dialog.component';
import {
  AssignableMembershipRole,
  MembershipAllowedAction,
  MembershipListItem,
  MembershipMutationResponse,
  MembershipRole,
  MembershipStatus,
  OwnershipTransferResponse,
} from '../models/membership.models';
import { MembershipsService } from '../services/memberships.service';

type ViewState = 'loading' | 'loaded' | 'empty' | 'forbidden' | 'tenant-context' | 'error';
interface RequestScope {
  organizationId: string;
  generation: number;
}

interface OwnershipTransferScope extends RequestScope {
  contextVersion: number;
  actorMembershipId: string;
  actorUserId: string;
  targetMembershipId: string;
  targetUserId: string;
}

type MembershipReloadResult = 'loaded' | 'failed' | 'stale';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly membershipsService = inject(MembershipsService);
  private readonly tenantAuthorityChangeService = inject(TenantAuthorityChangeService);
  private readonly tenantStateInvalidationCoordinator = inject(TenantStateInvalidationCoordinator);
  readonly tenantContextStore = inject(TenantContextStore);
  private loadSubscription?: Subscription;
  private mutationSubscription?: Subscription;
  private loadSequence = 0;
  private ownershipOperationSequence = 0;
  private activeOwnershipOperationId: number | null = null;
  private destroyed = false;

  readonly viewState = signal<ViewState>('loading');
  readonly memberships = signal<MembershipListItem[]>([]);
  readonly isMutating = signal(false);
  readonly ownershipReconciliationPending = signal(false);
  readonly actionMenuMembership = signal<MembershipListItem | null>(null);
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
  readonly interactionLocked = computed(
    () =>
      this.isMutating() ||
      this.ownershipReconciliationPending() ||
      this.tenantContextStore.isCanonicalContextSynchronizationPending() ||
      this.viewState() === 'loading',
  );
  readonly membershipSummary = computed(() => ({
    total: this.memberships().length,
    active: this.memberships().filter((membership) => membership.status === 'ACTIVE').length,
    suspended: this.memberships().filter((membership) => membership.status === 'SUSPENDED').length,
  }));

  constructor() {
    this.tenantStateInvalidationCoordinator.authorityReconciled
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ organizationId, generation }) => {
        if (
          this.tenantContextStore.selectedOrganizationId() !== organizationId ||
          this.tenantContextStore.switchGeneration() !== generation
        ) {
          return;
        }

        this.loadMemberships(true);
      });

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

  private reloadMembershipsForScope(scope: RequestScope): Promise<MembershipReloadResult> {
    const sequence = ++this.loadSequence;
    this.loadSubscription?.unsubscribe();
    this.viewState.set('loading');
    this.errorMessage.set('');

    return new Promise<MembershipReloadResult>((resolve) => {
      let settled = false;
      const settle = (result: MembershipReloadResult): void => {
        if (settled) {
          return;
        }

        settled = true;
        resolve(result);
      };

      this.loadSubscription = this.membershipsService.list(scope.organizationId).subscribe({
        next: (memberships) => {
          if (sequence !== this.loadSequence || !this.isScopeCurrent(scope)) {
            settle('stale');
            return;
          }

          this.memberships.set(memberships);
          this.viewState.set(memberships.length ? 'loaded' : 'empty');
          settle('loaded');
        },
        error: (error: HttpErrorResponse) => {
          if (sequence !== this.loadSequence || !this.isScopeCurrent(scope)) {
            settle('stale');
            return;
          }

          this.memberships.set([]);
          this.viewState.set(this.getLoadErrorState(error));
          settle('failed');
        },
        complete: () => {
          if (settled) {
            return;
          }

          if (sequence !== this.loadSequence || !this.isScopeCurrent(scope)) {
            settle('stale');
            return;
          }

          this.viewState.set('error');
          settle('failed');
        },
      });
    });
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
    return (
      membership.allowedActions.some((action) =>
        ['SUSPEND', 'REACTIVATE', 'REMOVE'].includes(action),
      ) || this.isOwnershipTransferEligible(membership)
    );
  }

  isOwnershipTransferEligible(target: MembershipListItem): boolean {
    const actor = this.tenantContextStore.snapshot()?.membership;

    return (
      !this.interactionLocked() &&
      this.tenantContextStore.isActiveTenantReady() &&
      !this.tenantContextStore.isCanonicalContextSynchronizationPending() &&
      this.tenantContextStore.hasCapability('ownership.transfer') &&
      actor !== undefined &&
      actor !== null &&
      actor.status === 'ACTIVE' &&
      actor.role === 'OWNER' &&
      target.status === 'ACTIVE' &&
      target.role !== 'OWNER' &&
      target.id !== actor.id &&
      target.userId !== actor.userId
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
    if (!this.hasAllowedAction(membership, 'CHANGE_ROLE') || this.interactionLocked()) {
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

  openOwnershipTransferDialog(target: MembershipListItem): void {
    const scope = this.captureOwnershipTransferScope(target);
    const organizationName = this.tenantContextStore.snapshot()?.organization?.displayName;

    if (!scope || !organizationName) {
      return;
    }

    const data: OwnershipTransferConfirmDialogData = {
      target,
      organizationName,
    };
    const dialogRef = this.dialog.open(OwnershipTransferConfirmDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      data,
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.transferOwnership(scope);
      }
    });
  }

  setActionMenuMembership(membership: MembershipListItem): void {
    this.actionMenuMembership.set(membership);
  }

  openActionConfirmation(
    membership: MembershipListItem,
    action: MembershipConfirmationAction,
  ): void {
    const allowedAction = action === 'LEAVE' ? null : action;
    if (
      (allowedAction && !this.hasAllowedAction(membership, allowedAction)) ||
      (action === 'LEAVE' && !this.canLeave()) ||
      this.interactionLocked()
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
    if (!scope || !this.hasAllowedAction(membership, 'CHANGE_ROLE') || this.interactionLocked()) {
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
    if (!scope || !this.hasAllowedAction(membership, action) || this.interactionLocked()) {
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
    if (!scope || !this.hasAllowedAction(membership, 'REMOVE') || this.interactionLocked()) {
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
    if (!scope || !this.canLeave() || this.interactionLocked()) {
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

  private transferOwnership(scope: OwnershipTransferScope): void {
    if (!this.isOwnershipTransferScopeCurrent(scope) || this.interactionLocked()) {
      return;
    }

    const operationId = ++this.ownershipOperationSequence;
    this.activeOwnershipOperationId = operationId;
    this.isMutating.set(true);
    this.ownershipReconciliationPending.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.mutationSubscription?.unsubscribe();
    let handedOffToReconciliation = false;
    this.mutationSubscription = this.membershipsService
      .transferOwnership(scope.organizationId, scope.targetMembershipId)
      .subscribe({
        next: (response) => {
          handedOffToReconciliation = true;
          void this.reconcileOwnershipTransfer(operationId, scope, response).catch(() => {
            this.handleUnexpectedOwnershipFailure(operationId, scope);
          });
        },
        error: (error: HttpErrorResponse) => {
          handedOffToReconciliation = true;
          void this.reconcileOwnershipFailure(operationId, scope, error).catch(() => {
            this.handleUnexpectedOwnershipFailure(operationId, scope);
          });
        },
        complete: () => {
          if (!handedOffToReconciliation) {
            this.finishOwnershipTransfer(operationId, false);
          }
        },
      });
  }

  private async reconcileOwnershipTransfer(
    operationId: number,
    scope: OwnershipTransferScope,
    response: OwnershipTransferResponse,
  ): Promise<void> {
    if (!this.isOwnershipOperationCurrent(operationId, scope)) {
      this.finishOwnershipTransfer(operationId, false);
      return;
    }

    if (!this.isOwnershipTransferResponseValid(scope, response)) {
      await this.reconcileOwnershipFailure(
        operationId,
        scope,
        new HttpErrorResponse({ status: 0, error: { code: 'UNEXPECTED_ERROR' } }),
      );
      return;
    }

    this.tenantAuthorityChangeService.emitOwnershipTransferred(scope.organizationId);
    const synchronization = await this.tenantContextStore.synchronizeCanonicalContext(
      scope.generation,
      scope.organizationId,
      true,
    );

    if (
      !this.isOwnershipOperationTokenCurrent(operationId) ||
      !this.isScopeCurrent(scope) ||
      synchronization === 'stale'
    ) {
      this.finishOwnershipTransfer(operationId, false);
      return;
    }

    const reloaded = await this.reloadMembershipsForScope(scope);
    if (
      !this.isOwnershipOperationTokenCurrent(operationId) ||
      !this.isScopeCurrent(scope) ||
      reloaded === 'stale'
    ) {
      this.finishOwnershipTransfer(operationId, false);
      return;
    }

    if (synchronization === 'failed') {
      this.errorMessage.set(
        'La transferencia se completó, pero no fue posible confirmar el contexto actualizado. Revisa la organización antes de intentarlo de nuevo.',
      );
      this.finishOwnershipTransfer(operationId, true);
      return;
    }

    if (reloaded === 'failed') {
      this.errorMessage.set(
        'La propiedad se transfirió y tus permisos se actualizaron, pero no fue posible actualizar la lista de miembros. Recarga la lista antes de continuar.',
      );
      this.finishOwnershipTransfer(operationId, true);
      return;
    }

    this.successMessage.set(
      'La propiedad se transfirió. Tus permisos y la lista de miembros se actualizaron.',
    );
    this.finishOwnershipTransfer(operationId, true);
  }

  private async reconcileOwnershipFailure(
    operationId: number,
    scope: OwnershipTransferScope,
    error: HttpErrorResponse,
  ): Promise<void> {
    if (!this.isOwnershipOperationTokenCurrent(operationId) || !this.isScopeCurrent(scope)) {
      this.finishOwnershipTransfer(operationId, false);
      return;
    }

    const requiresReconciliation = error.status === 0 || [403, 404, 409].includes(error.status);
    if (requiresReconciliation) {
      const synchronization = await this.tenantContextStore.synchronizeCanonicalContext(
        scope.generation,
        scope.organizationId,
        true,
      );

      if (
        !this.isOwnershipOperationTokenCurrent(operationId) ||
        !this.isScopeCurrent(scope) ||
        synchronization === 'stale'
      ) {
        this.finishOwnershipTransfer(operationId, false);
        return;
      }

      const reloaded = await this.reloadMembershipsForScope(scope);
      if (
        !this.isOwnershipOperationTokenCurrent(operationId) ||
        !this.isScopeCurrent(scope) ||
        reloaded === 'stale'
      ) {
        this.finishOwnershipTransfer(operationId, false);
        return;
      }
    }

    if (this.isOwnershipOperationTokenCurrent(operationId) && this.isScopeCurrent(scope)) {
      this.errorMessage.set(this.ownershipTransferErrorMessage(error));
      this.finishOwnershipTransfer(operationId, true);
    } else {
      this.finishOwnershipTransfer(operationId, false);
    }
  }

  private handleUnexpectedOwnershipFailure(
    operationId: number,
    scope: OwnershipTransferScope,
  ): void {
    if (!this.isOwnershipOperationTokenCurrent(operationId)) {
      return;
    }

    if (this.isScopeCurrent(scope)) {
      this.errorMessage.set(
        this.ownershipTransferErrorMessage(new HttpErrorResponse({ status: 0 })),
      );
      this.finishOwnershipTransfer(operationId, true);
      return;
    }

    this.finishOwnershipTransfer(operationId, false);
  }

  private ownershipTransferErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'El servidor rechazó esta acción. Tus permisos pudieron haber cambiado.';
    }
    if (error.status === 404) {
      return 'No fue posible completar la transferencia con los datos disponibles.';
    }
    if (error.status === 409) {
      return 'La organización o el miembro cambiaron. Revisa la lista y confirma de nuevo.';
    }
    if (error.status === 0) {
      return 'No se pudo confirmar el resultado de la transferencia. Revisa la lista antes de intentarlo de nuevo.';
    }
    if (error.status === 400) {
      return 'Los datos de la transferencia no son válidos. Revisa el miembro seleccionado.';
    }
    return 'No fue posible completar la transferencia. Intenta de nuevo cuando la organización esté disponible.';
  }

  private isOwnershipOperationTokenCurrent(operationId: number): boolean {
    return this.activeOwnershipOperationId === operationId;
  }

  private isOwnershipOperationCurrent(operationId: number, scope: OwnershipTransferScope): boolean {
    return (
      this.isOwnershipOperationTokenCurrent(operationId) &&
      this.isOwnershipTransferScopeCurrent(scope)
    );
  }

  private finishOwnershipTransfer(operationId: number, publishFeedback: boolean): void {
    if (!this.isOwnershipOperationTokenCurrent(operationId)) {
      return;
    }

    this.activeOwnershipOperationId = null;
    this.ownershipReconciliationPending.set(false);
    this.isMutating.set(false);

    if (!publishFeedback) {
      this.successMessage.set('');
      this.errorMessage.set('');
    }
  }

  private captureOwnershipTransferScope(target: MembershipListItem): OwnershipTransferScope | null {
    if (!this.isOwnershipTransferEligible(target)) {
      return null;
    }

    const snapshot = this.tenantContextStore.snapshot();
    const organizationId = this.tenantContextStore.selectedOrganizationId();
    const actor = snapshot?.membership;
    if (!organizationId || !actor) {
      return null;
    }

    return {
      organizationId,
      generation: this.tenantContextStore.switchGeneration(),
      contextVersion: this.tenantContextStore.contextVersion(),
      actorMembershipId: actor.id,
      actorUserId: actor.userId,
      targetMembershipId: target.id,
      targetUserId: target.userId,
    };
  }

  private isOwnershipTransferScopeCurrent(scope: OwnershipTransferScope): boolean {
    if (!this.isScopeCurrent(scope)) {
      return false;
    }

    const snapshot = this.tenantContextStore.snapshot();
    const actor = snapshot?.membership;
    const target = this.memberships().find(
      (membership) => membership.id === scope.targetMembershipId,
    );

    return (
      this.tenantContextStore.isActiveTenantReady() &&
      !this.tenantContextStore.isCanonicalContextSynchronizationPending() &&
      this.tenantContextStore.hasCapability('ownership.transfer') &&
      actor?.id === scope.actorMembershipId &&
      actor.userId === scope.actorUserId &&
      actor.role === 'OWNER' &&
      actor.status === 'ACTIVE' &&
      target?.id === scope.targetMembershipId &&
      target.userId === scope.targetUserId &&
      target.status === 'ACTIVE' &&
      target.role !== 'OWNER' &&
      target.id !== actor.id &&
      target.userId !== actor.userId
    );
  }

  private isOwnershipTransferResponseValid(
    scope: OwnershipTransferScope,
    response: OwnershipTransferResponse,
  ): boolean {
    if (
      !response ||
      typeof response !== 'object' ||
      !response.sourceMembership ||
      !response.targetMembership
    ) {
      return false;
    }

    return (
      response.organizationId === scope.organizationId &&
      response.sourceMembership.id === scope.actorMembershipId &&
      response.sourceMembership.userId === scope.actorUserId &&
      response.sourceMembership.role === 'ADMIN' &&
      response.sourceMembership.status === 'ACTIVE' &&
      response.targetMembership.id === scope.targetMembershipId &&
      response.targetMembership.userId === scope.targetUserId &&
      response.targetMembership.role === 'OWNER' &&
      response.targetMembership.status === 'ACTIVE' &&
      typeof response.transferredAt === 'string'
    );
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
