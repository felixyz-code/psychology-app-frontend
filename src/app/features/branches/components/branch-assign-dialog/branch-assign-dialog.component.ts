import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { firstValueFrom } from 'rxjs';

import { Branch, BranchStaffAssignmentItem } from '../../../../core/models/branch.models';
import { BranchesService } from '../../../../core/services/branches.service';
import { MembershipsService } from '../../../membership-administration/services/memberships.service';
import { TenantContextStore } from '../../../../core/tenant-context/tenant-context.store';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

export interface BranchAssignDialogData {
  branch: Branch;
}

@Component({
  selector: 'app-branch-assign-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatCheckboxModule,
  ],
  templateUrl: './branch-assign-dialog.component.html',
  styleUrl: './branch-assign-dialog.component.scss',
})
export class BranchAssignDialogComponent implements OnInit {
  readonly data = inject<BranchAssignDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BranchAssignDialogComponent>);
  private readonly branchesService = inject(BranchesService);
  private readonly membershipsService = inject(MembershipsService);
  private readonly tenantContextStore = inject(TenantContextStore);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly items = signal<BranchStaffAssignmentItem[]>([]);
  readonly updatingUserId = signal<string | null>(null);

  readonly assignedCount = computed(() => this.items().filter((i) => i.isAssigned).length);

  ngOnInit(): void {
    void this.loadStaffData();
  }

  async loadStaffData(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const orgId = this.tenantContextStore.selectedOrganizationId();
    if (!orgId) {
      this.errorMessage.set('No se encontró la organización activa.');
      this.isLoading.set(false);
      return;
    }

    try {
      const [memberships, branchAccesses] = await Promise.all([
        firstValueFrom(this.membershipsService.list(orgId)),
        firstValueFrom(this.branchesService.getBranchUsers(this.data.branch.id)),
      ]);

      const accessMap = new Map<string, { isPrimary: boolean; accessId: string }>();
      for (const access of branchAccesses) {
        accessMap.set(access.userId, {
          isPrimary: access.isPrimary,
          accessId: access.id,
        });
      }

      const assignmentItems: BranchStaffAssignmentItem[] = memberships.map((member) => {
        const access = accessMap.get(member.userId);
        return {
          userId: member.userId,
          displayName: member.displayName || member.email,
          email: member.email,
          role: member.role,
          isAssigned: Boolean(access),
          isPrimary: access?.isPrimary ?? false,
          accessId: access?.accessId,
        };
      });

      // Sort: assigned first, then alphabetical
      assignmentItems.sort((a, b) => {
        if (a.isAssigned !== b.isAssigned) {
          return a.isAssigned ? -1 : 1;
        }
        return a.displayName.localeCompare(b.displayName);
      });

      this.items.set(assignmentItems);
    } catch (err: unknown) {
      this.errorMessage.set('Error al cargar la lista de personal y asignaciones.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleAssignment(item: BranchStaffAssignmentItem, assigned: boolean): Promise<void> {
    this.updatingUserId.set(item.userId);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      if (assigned) {
        await firstValueFrom(
          this.branchesService.assignUser(this.data.branch.id, {
            userId: item.userId,
            isPrimary: item.isPrimary,
          }),
        );
        this.items.update((list) =>
          list.map((i) => (i.userId === item.userId ? { ...i, isAssigned: true } : i)),
        );
        this.successMessage.set(`Acceso asignado a ${item.displayName}.`);
      } else {
        await firstValueFrom(
          this.branchesService.removeUserAccess(this.data.branch.id, item.userId),
        );
        this.items.update((list) =>
          list.map((i) =>
            i.userId === item.userId ? { ...i, isAssigned: false, isPrimary: false } : i,
          ),
        );
        this.successMessage.set(`Acceso revocado a ${item.displayName}.`);
      }
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof HttpErrorResponse && err.error?.message
          ? err.error.message
          : 'Error al actualizar la asignación.',
      );
    } finally {
      this.updatingUserId.set(null);
    }
  }

  async togglePrimary(item: BranchStaffAssignmentItem, isPrimary: boolean): Promise<void> {
    if (!item.isAssigned) return;

    this.updatingUserId.set(item.userId);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await firstValueFrom(
        this.branchesService.assignUser(this.data.branch.id, {
          userId: item.userId,
          isPrimary,
        }),
      );
      this.items.update((list) =>
        list.map((i) => (i.userId === item.userId ? { ...i, isPrimary } : i)),
      );
      this.successMessage.set(
        isPrimary
          ? `Sede principal configurada para ${item.displayName}.`
          : `Sede principal desmarcada para ${item.displayName}.`,
      );
    } catch (err: unknown) {
      this.errorMessage.set('Error al actualizar sede principal.');
    } finally {
      this.updatingUserId.set(null);
    }
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      OWNER: 'Propietario',
      ADMIN: 'Administrador',
      PSYCHOLOGIST: 'Psicólogo',
      RECEPTIONIST: 'Recepcionista',
      BILLING: 'Facturación',
      AUDITOR: 'Auditor',
      READ_ONLY: 'Solo lectura',
    };
    return map[role] || role;
  }

  close(): void {
    this.dialogRef.close(true);
  }
}
