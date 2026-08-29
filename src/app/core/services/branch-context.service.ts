import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Subject, Subscription } from 'rxjs';

import { Branch, UserBranchAccess } from '../models/branch.models';
import { BranchesService } from './branches.service';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { AuthStore } from '../auth/auth.store';
import { resolveBusinessHours } from '../../features/appointments/utils/appointment-datetime';

export const ACTIVE_BRANCH_STORAGE_KEY = 'app_active_branch_id';

@Injectable({ providedIn: 'root' })
export class BranchContextService {
  private readonly branchesService = inject(BranchesService);
  private readonly tenantContextStore = inject(TenantContextStore);
  private readonly authStore = inject(AuthStore);

  private getInitialBranchId(): string | null {
    try {
      const persisted = localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
      if (persisted && persisted !== 'ALL') {
        return persisted;
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private readonly availableBranchesSignal = signal<Branch[]>([]);
  private readonly currentBranchIdSignal = signal<string | null>(this.getInitialBranchId());
  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly branchChangesSubject = new Subject<string | null>();

  readonly availableBranches = computed(() => this.availableBranchesSignal());
  readonly currentBranchId = computed(() => this.currentBranchIdSignal());
  readonly currentBranch = computed(() => {
    const id = this.currentBranchIdSignal();
    if (!id || id === 'ALL') return null;
    return this.availableBranchesSignal().find((b) => b.id === id) ?? null;
  });
  readonly isLoading = computed(() => this.isLoadingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly hasMultipleBranches = computed(() => this.availableBranchesSignal().length > 1);
  readonly branchChanges = this.branchChangesSubject.asObservable();
  readonly effectiveBusinessHours = computed(() => {
    return resolveBusinessHours(this.currentBranch());
  });

  readonly canSelectAllBranches = computed(() => {
    const role = this.tenantContextStore.snapshot()?.membership?.role;
    return role === 'OWNER' || role === 'ADMIN';
  });

  readonly isAllBranchesSelected = computed(() => {
    return this.currentBranchIdSignal() === null && this.canSelectAllBranches();
  });

  readonly activeBranchBadge = computed<'Matriz' | 'Sucursal' | 'Todas' | null>(() => {
    if (this.isAllBranchesSelected()) {
      return 'Todas';
    }
    const branch = this.currentBranch();
    if (!branch) {
      return null;
    }
    return branch.isPrimary ? 'Matriz' : 'Sucursal';
  });

  readonly activeBranchDisplayName = computed<string>(() => {
    if (this.isAllBranchesSelected()) {
      return 'Todas las sedes';
    }
    const branch = this.currentBranch();
    return branch ? branch.name : 'Seleccionar sede';
  });

  private tenantSubscription?: Subscription;

  constructor() {
    this.initTenantListener();
  }

  private initTenantListener(): void {
    // Re-evaluate when tenant context changes or invalidates
    this.tenantSubscription = this.tenantContextStore.invalidations?.subscribe(() => {
      this.clearActiveBranch();
      this.availableBranchesSignal.set([]);
    });

    this.authStore.sessionChanges?.subscribe((user) => {
      if (!user) {
        this.clearActiveBranch();
        this.availableBranchesSignal.set([]);
      }
    });
  }

  async loadBranches(): Promise<Branch[]> {
    if (!this.tenantContextStore.isActiveTenantReady()) {
      this.availableBranchesSignal.set([]);
      this.currentBranchIdSignal.set(null);
      return [];
    }

    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      let branches: Branch[] = [];
      const isGlobalAdmin = this.canSelectAllBranches();

      if (isGlobalAdmin) {
        // Admins can see all active organization branches
        const allBranches = await firstValueFrom(
          this.branchesService.findAll({ includeInactive: false }),
        );
        // Also fetch my accesses to identify primary branch
        let myAccesses: UserBranchAccess[] = [];
        try {
          myAccesses = await firstValueFrom(this.branchesService.getMyBranches());
        } catch {
          // If no specific branch access exists yet, use raw branches
        }
        const primaryBranchId = myAccesses.find((a) => a.isPrimary)?.branchId;
        branches = allBranches.map((b) => ({
          ...b,
          isPrimary: b.id === primaryBranchId,
        }));
      } else {
        // Regular users get strictly their assigned branches
        const accesses = await firstValueFrom(this.branchesService.getMyBranches());
        branches = accesses
          .filter((a) => a.branch && a.branch.isActive)
          .map((a) => ({
            ...a.branch!,
            isPrimary: a.isPrimary,
          }));
      }

      this.availableBranchesSignal.set(branches);
      this.reconcileActiveBranch(branches);
      return branches;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No fue posible cargar las sedes';
      this.errorSignal.set(msg);
      return [];
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  setActiveBranch(branchId: string | null): void {
    if (branchId === null || branchId === 'ALL') {
      if (this.canSelectAllBranches()) {
        this.currentBranchIdSignal.set(null);
        try {
          localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, 'ALL');
        } catch {
          // Ignore
        }
        this.branchChangesSubject.next(null);
      }
      return;
    }

    const branch = this.availableBranchesSignal().find((b) => b.id === branchId);
    if (!branch) {
      return;
    }

    this.currentBranchIdSignal.set(branchId);
    try {
      localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, branchId);
    } catch {
      // Ignore storage errors in restricted contexts
    }
    this.branchChangesSubject.next(branchId);
  }

  clearActiveBranch(): void {
    this.currentBranchIdSignal.set(null);
    try {
      localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
    } catch {
      // Ignore
    }
    this.branchChangesSubject.next(null);
  }

  private reconcileActiveBranch(branches: Branch[]): void {
    if (branches.length === 0) {
      this.clearActiveBranch();
      return;
    }

    if (branches.length === 1 && !this.canSelectAllBranches()) {
      this.setActiveBranch(branches[0].id);
      return;
    }

    let persistedBranchId: string | null = null;
    try {
      persistedBranchId = localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
    } catch {
      // Ignore
    }

    if (persistedBranchId === 'ALL' && this.canSelectAllBranches()) {
      this.currentBranchIdSignal.set(null);
      return;
    }

    if (
      persistedBranchId &&
      persistedBranchId !== 'ALL' &&
      branches.some((b) => b.id === persistedBranchId && b.isActive !== false)
    ) {
      this.setActiveBranch(persistedBranchId);
      return;
    }

    // Next fallback: find primary branch
    const primary = branches.find((b) => b.isPrimary && b.isActive !== false);
    if (primary) {
      this.setActiveBranch(primary.id);
      return;
    }

    // Fallback: first available active branch
    const firstActive = branches.find((b) => b.isActive !== false) ?? branches[0];
    if (firstActive) {
      this.setActiveBranch(firstActive.id);
    }
  }
}
