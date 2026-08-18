import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { Branch } from '../../../core/models/branch.models';
import { BranchesService } from '../../../core/services/branches.service';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { BranchFormDialogComponent } from '../components/branch-form-dialog/branch-form-dialog.component';
import { BranchAssignDialogComponent } from '../components/branch-assign-dialog/branch-assign-dialog.component';
import { BranchDeleteDialogComponent } from '../components/branch-delete-dialog/branch-delete-dialog.component';

type ViewState = 'loading' | 'loaded' | 'empty' | 'error' | 'forbidden';

@Component({
  selector: 'app-branches-list-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    DataTableEmptyStateComponent,
  ],
  templateUrl: './branches-list.page.html',
  styleUrl: './branches-list.page.scss',
})
export class BranchesListPage implements OnInit {
  private readonly branchesService = inject(BranchesService);
  private readonly branchContextService = inject(BranchContextService);
  private readonly dialog = inject(MatDialog);
  readonly tenantContextStore = inject(TenantContextStore);

  readonly viewState = signal<ViewState>('loading');
  readonly branches = signal<Branch[]>([]);
  readonly searchTerm = signal('');
  readonly includeInactive = signal(true);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly displayedColumns: string[] = [
    'code',
    'name',
    'address',
    'phone',
    'timezone',
    'status',
    'actions',
  ];

  readonly filteredBranches = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.branches();

    if (!term) {
      return list;
    }

    return list.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term) ||
        (b.address && b.address.toLowerCase().includes(term)) ||
        (b.phone && b.phone.toLowerCase().includes(term)) ||
        b.timezone.toLowerCase().includes(term),
    );
  });

  readonly summary = computed(() => {
    const all = this.branches();
    return {
      total: all.length,
      active: all.filter((b) => b.isActive).length,
      inactive: all.filter((b) => !b.isActive).length,
    };
  });

  readonly canManage = computed(() => {
    const role = this.tenantContextStore.snapshot()?.membership?.role;
    if (role === 'OWNER' || role === 'ADMIN') {
      return true;
    }
    return (
      this.tenantContextStore.hasCapability('organization.manage') ||
      this.tenantContextStore.hasCapability('organization.read')
    );
  });

  ngOnInit(): void {
    void this.loadBranches();
  }

  async loadBranches(): Promise<void> {
    this.viewState.set('loading');
    this.errorMessage.set('');

    try {
      const data = await firstValueFrom(
        this.branchesService.findAll({ includeInactive: this.includeInactive() }),
      );
      this.branches.set(data);
      this.viewState.set(data.length > 0 ? 'loaded' : 'empty');
    } catch (err: unknown) {
      this.errorMessage.set('No fue posible cargar las sedes de la organización.');
      this.viewState.set('error');
    }
  }

  onIncludeInactiveChange(): void {
    void this.loadBranches();
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(BranchFormDialogComponent, {
      data: { mode: 'create' },
      maxWidth: '42rem',
      maxHeight: '85vh',
      width: '100%',
    });

    ref.afterClosed().subscribe((result: Branch | undefined) => {
      if (result) {
        this.successMessage.set(`Sede "${result.name}" creada exitosamente.`);
        void this.loadBranches();
        void this.branchContextService.loadBranches();
      }
    });
  }

  openEditDialog(branch: Branch): void {
    const ref = this.dialog.open(BranchFormDialogComponent, {
      data: { mode: 'edit', branch },
      maxWidth: '42rem',
      maxHeight: '85vh',
      width: '100%',
    });

    ref.afterClosed().subscribe((result: Branch | undefined) => {
      if (result) {
        this.successMessage.set(`Sede "${result.name}" actualizada.`);
        void this.loadBranches();
        void this.branchContextService.loadBranches();
      }
    });
  }

  openAssignDialog(branch: Branch): void {
    const ref = this.dialog.open(BranchAssignDialogComponent, {
      data: { branch },
      maxWidth: '44rem',
      maxHeight: '85vh',
      width: '100%',
    });

    ref.afterClosed().subscribe(() => {
      void this.branchContextService.loadBranches();
    });
  }

  openDeleteDialog(branch: Branch): void {
    const ref = this.dialog.open(BranchDeleteDialogComponent, {
      data: { branch },
      maxWidth: '34rem',
      maxHeight: '85vh',
      width: '100%',
    });

    ref.afterClosed().subscribe((deleted: boolean | undefined) => {
      if (deleted) {
        this.successMessage.set(`Sede "${branch.name}" eliminada.`);
        void this.loadBranches();
        void this.branchContextService.loadBranches();
      }
    });
  }
}
