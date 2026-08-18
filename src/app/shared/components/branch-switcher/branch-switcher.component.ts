import { Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Branch } from '../../../core/models/branch.models';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';

@Component({
  selector: 'app-branch-switcher',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule],
  templateUrl: './branch-switcher.component.html',
  styleUrl: './branch-switcher.component.scss',
})
export class BranchSwitcherComponent implements OnInit {
  readonly branchContextService = inject(BranchContextService);
  readonly tenantContextStore = inject(TenantContextStore);
  private readonly router = inject(Router, { optional: true });

  readonly availableBranches = this.branchContextService.availableBranches;
  readonly currentBranch = this.branchContextService.currentBranch;
  readonly isLoading = this.branchContextService.isLoading;
  readonly hasMultipleBranches = this.branchContextService.hasMultipleBranches;

  readonly isVisible = computed(() => {
    return this.tenantContextStore.isActiveTenantReady() && this.availableBranches().length > 0;
  });

  ngOnInit(): void {
    if (this.tenantContextStore.isActiveTenantReady()) {
      void this.branchContextService.loadBranches();
    }
  }

  selectBranch(branchOrId: Branch | string): void {
    const branchId = typeof branchOrId === 'string' ? branchOrId : branchOrId.id;
    if (!branchId || branchId === this.currentBranch()?.id) {
      return;
    }

    this.branchContextService.setActiveBranch(branchId);

    // Emit global event for components listening to window custom events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app:branch-changed', {
          detail: {
            branchId,
            branch: this.availableBranches().find((b) => b.id === branchId),
          },
        }),
      );
    }

    // Refresh active route so components / queries re-execute with new branch context
    if (this.router) {
      const currentUrl = this.router.url;
      void this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        void this.router?.navigateByUrl(currentUrl);
      });
    }
  }

  switchBranch(branchId: string): void {
    this.selectBranch(branchId);
  }
}
