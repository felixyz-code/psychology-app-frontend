import { Component, computed, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Branch } from '../../../core/models/branch.models';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';

@Component({
  selector: 'app-branch-switcher',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './branch-switcher.component.html',
  styleUrl: './branch-switcher.component.scss',
})
export class BranchSwitcherComponent implements OnInit {
  readonly branchContextService = inject(BranchContextService);
  readonly tenantContextStore = inject(TenantContextStore);

  readonly availableBranches = this.branchContextService.availableBranches;
  readonly currentBranch = this.branchContextService.currentBranch;
  readonly currentBranchId = this.branchContextService.currentBranchId;
  readonly isLoading = this.branchContextService.isLoading;
  readonly hasMultipleBranches = this.branchContextService.hasMultipleBranches;
  readonly canSelectAllBranches = this.branchContextService.canSelectAllBranches;
  readonly isAllBranchesSelected = this.branchContextService.isAllBranchesSelected;
  readonly activeBranchBadge = this.branchContextService.activeBranchBadge;
  readonly activeBranchDisplayName = this.branchContextService.activeBranchDisplayName;

  readonly isVisible = computed(() => {
    return this.tenantContextStore.isActiveTenantReady() && this.availableBranches().length > 0;
  });

  readonly isMenuEnabled = computed(() => {
    return this.hasMultipleBranches() || this.canSelectAllBranches();
  });

  ngOnInit(): void {
    if (this.tenantContextStore.isActiveTenantReady()) {
      void this.branchContextService.loadBranches();
    }
  }

  selectBranch(branchOrIdOrNull: Branch | string | null): void {
    let targetId: string | null = null;
    if (branchOrIdOrNull === null || branchOrIdOrNull === 'ALL') {
      targetId = 'ALL';
    } else if (typeof branchOrIdOrNull === 'string') {
      targetId = branchOrIdOrNull;
    } else {
      targetId = branchOrIdOrNull.id;
    }

    const currentId = this.currentBranchId();
    if (targetId === 'ALL' && this.isAllBranchesSelected()) {
      return;
    }
    if (targetId !== 'ALL' && targetId === currentId) {
      return;
    }

    this.branchContextService.setActiveBranch(targetId === 'ALL' ? null : targetId);

    // Emit global event for any legacy components listening to window custom events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app:branch-changed', {
          detail: {
            branchId: targetId === 'ALL' ? null : targetId,
            branch:
              targetId === 'ALL'
                ? null
                : this.availableBranches().find((b) => b.id === targetId),
          },
        }),
      );
    }
  }

  switchBranch(branchId: string | null): void {
    this.selectBranch(branchId);
  }
}
