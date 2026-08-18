import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Branch, UserBranchAccess } from '../models/branch.models';
import { ACTIVE_BRANCH_STORAGE_KEY, BranchContextService } from './branch-context.service';
import { BranchesService } from './branches.service';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { AuthStore } from '../auth/auth.store';

const mockBranch1: Branch = {
  id: 'branch-1',
  organizationId: 'org-1',
  name: 'Sede Central',
  code: 'CENTRO',
  timezone: 'America/Mexico_City',
  isActive: true,
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
  isPrimary: true,
};

const mockBranch2: Branch = {
  id: 'branch-2',
  organizationId: 'org-1',
  name: 'Sede Sur',
  code: 'SUR',
  timezone: 'America/Mexico_City',
  isActive: true,
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
  isPrimary: false,
};

describe('BranchContextService', () => {
  let service: BranchContextService;
  let branchesServiceMock: {
    findAll: ReturnType<typeof vi.fn>;
    getMyBranches: ReturnType<typeof vi.fn>;
  };
  let tenantContextStoreMock: {
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    hasCapability: ReturnType<typeof vi.fn>;
    invalidations: { subscribe: ReturnType<typeof vi.fn> };
  };
  let authStoreMock: {
    sessionChanges: { subscribe: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    localStorage.clear();

    branchesServiceMock = {
      findAll: vi.fn().mockReturnValue(of([mockBranch1, mockBranch2])),
      getMyBranches: vi.fn().mockReturnValue(
        of([
          {
            id: 'access-1',
            organizationId: 'org-1',
            userId: 'user-1',
            branchId: 'branch-1',
            isPrimary: true,
            createdAt: '2026-08-14T00:00:00Z',
            updatedAt: '2026-08-14T00:00:00Z',
            branch: mockBranch1,
          } as UserBranchAccess,
        ]),
      ),
    };

    tenantContextStoreMock = {
      isActiveTenantReady: vi.fn().mockReturnValue(true),
      hasCapability: vi.fn().mockReturnValue(true),
      invalidations: { subscribe: vi.fn() },
    };

    authStoreMock = {
      sessionChanges: { subscribe: vi.fn() },
    };

    TestBed.configureTestingModule({
      providers: [
        BranchContextService,
        { provide: BranchesService, useValue: branchesServiceMock },
        { provide: TenantContextStore, useValue: tenantContextStoreMock },
        { provide: AuthStore, useValue: authStoreMock },
      ],
    });

    service = TestBed.inject(BranchContextService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with empty signals and inactive branch', () => {
    expect(service.availableBranches()).toEqual([]);
    expect(service.currentBranch()).toBeNull();
    expect(service.currentBranchId()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  it('loads branches and auto-selects primary branch when localStorage is empty', async () => {
    const branches = await service.loadBranches();

    expect(branches.length).toBe(2);
    expect(service.availableBranches().length).toBe(2);
    expect(service.currentBranchId()).toBe('branch-1');
    expect(service.currentBranch()?.name).toBe('Sede Central');
    expect(localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY)).toBe('branch-1');
  });

  it('restores stored branch from localStorage if valid in loaded list', async () => {
    localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, 'branch-2');

    await service.loadBranches();

    expect(service.currentBranchId()).toBe('branch-2');
    expect(service.currentBranch()?.name).toBe('Sede Sur');
  });

  it('explicitly switches active branch and saves to localStorage', async () => {
    await service.loadBranches();
    expect(service.currentBranchId()).toBe('branch-1');

    service.setActiveBranch('branch-2');

    expect(service.currentBranchId()).toBe('branch-2');
    expect(service.currentBranch()?.code).toBe('SUR');
    expect(localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY)).toBe('branch-2');
  });

  it('ignores setting unknown branch ID', async () => {
    await service.loadBranches();

    service.setActiveBranch('unknown-id');

    expect(service.currentBranchId()).toBe('branch-1');
  });

  it('clears active branch and removes from localStorage', async () => {
    await service.loadBranches();
    expect(service.currentBranchId()).toBe('branch-1');

    service.clearActiveBranch();

    expect(service.currentBranchId()).toBeNull();
    expect(service.currentBranch()).toBeNull();
    expect(localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY)).toBeNull();
  });

  it('emits on branchChanges when switching or clearing branch', async () => {
    await service.loadBranches();

    const emitted: (string | null)[] = [];
    const sub = service.branchChanges.subscribe((id) => emitted.push(id));

    service.setActiveBranch('branch-2');
    service.clearActiveBranch();

    expect(emitted).toEqual(['branch-2', null]);
    sub.unsubscribe();
  });

  it('handles errors gracefully during loadBranches', async () => {
    branchesServiceMock.findAll.mockReturnValue(throwError(() => new Error('Network error')));

    const result = await service.loadBranches();

    expect(result).toEqual([]);
    expect(service.error()).toBe('Network error');
    expect(service.isLoading()).toBe(false);
  });
});
