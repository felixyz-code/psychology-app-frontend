import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { TenantContextStore } from './tenant-context.store';
import { TenantAuthorityChangeService } from './tenant-authority-change.service';

export interface TenantAuthorityReconciled {
  readonly organizationId: string;
  readonly generation: number;
}

@Injectable({ providedIn: 'root' })
export class TenantStateInvalidationCoordinator {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly tenantContextStore = inject(TenantContextStore);
  private readonly tenantAuthorityChangeService = inject(TenantAuthorityChangeService);
  private readonly authorityReconciledSubject = new Subject<TenantAuthorityReconciled>();

  readonly authorityReconciled = this.authorityReconciledSubject.asObservable();

  constructor() {
    this.tenantContextStore.invalidations
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ reason }) => {
        this.dialog.closeAll();

        if (reason === 'tenant-switch') {
          return;
        }

        if (reason === 'membership-left') {
          this.navigateToOrganizationSelection();
          return;
        }

        if (reason === 'organization-suspended') {
          this.navigateToOrganizationAdministration();
          return;
        }

        if (
          reason === 'invalid-context' ||
          reason === 'context-resolution-failed' ||
          reason === 'authorization-loss'
        ) {
          this.navigateToOrganizationSelection();
          return;
        }

        if (reason === 'access-loss') {
          void this.router.navigate(['/login'], { replaceUrl: true });
        }
      });

    this.tenantAuthorityChangeService.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((change) => void this.reconcileAuthorityChange(change));
  }

  private async reconcileAuthorityChange(change: {
    readonly organizationId: string;
  }): Promise<void> {
    if (this.tenantContextStore.selectedOrganizationId() !== change.organizationId) {
      return;
    }

    this.dialog.closeAll();
    const generation = this.tenantContextStore.switchGeneration();

    try {
      const synchronization = await this.tenantContextStore.synchronizeCanonicalContext(
        generation,
        change.organizationId,
        true,
      );

      if (
        synchronization !== 'synchronized' ||
        !this.tenantContextStore.isRequestContextCurrent(generation, change.organizationId)
      ) {
        return;
      }

      this.authorityReconciledSubject.next({
        organizationId: change.organizationId,
        generation,
      });
    } catch {
      // Fail closed. The canonical context store owns the recovery path.
    }
  }

  private navigateToOrganizationSelection(): void {
    if (this.router.url.startsWith('/organization-selection')) {
      return;
    }

    void this.router.navigate(['/organization-selection'], { replaceUrl: true });
  }

  private navigateToOrganizationAdministration(): void {
    if (this.router.url.startsWith('/organization-administration')) {
      return;
    }

    void this.router.navigate(['/organization-administration'], { replaceUrl: true });
  }
}
