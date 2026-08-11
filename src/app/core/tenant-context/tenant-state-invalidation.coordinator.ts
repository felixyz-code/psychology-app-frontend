import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { TenantContextStore } from './tenant-context.store';
import { TenantAuthorityChangeService } from './tenant-authority-change.service';

@Injectable({ providedIn: 'root' })
export class TenantStateInvalidationCoordinator {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly tenantContextStore = inject(TenantContextStore);
  private readonly tenantAuthorityChangeService = inject(TenantAuthorityChangeService);

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
      .subscribe((change) => {
        if (this.tenantContextStore.selectedOrganizationId() !== change.organizationId) {
          return;
        }

        this.dialog.closeAll();
        const generation = this.tenantContextStore.switchGeneration();
        void this.tenantContextStore.synchronizeCanonicalContext(
          generation,
          change.organizationId,
          true,
        );
      });
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
