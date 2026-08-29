import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Branch } from '../../../core/models/branch.models';
import { BranchesService } from '../../../core/services/branches.service';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { TenantContextStore } from '../../../core/tenant-context/tenant-context.store';
import { BranchesListPage } from './branches-list.page';

const mockBranches: Branch[] = [
  {
    id: 'branch-1',
    organizationId: 'org-1',
    name: 'Sede Central (Matriz)',
    code: 'CDMX-CENTRO',
    address: 'Av. Insurgentes 100',
    phone: '5511223344',
    timezone: 'America/Mexico_City',
    isActive: true,
    createdAt: '2026-08-14T00:00:00Z',
    updatedAt: '2026-08-14T00:00:00Z',
    isPrimary: true,
  },
  {
    id: 'branch-2',
    organizationId: 'org-1',
    name: 'Sede Guadalajara',
    code: 'GDL-SUR',
    address: 'Av. Chapultepec 50',
    phone: '3311223344',
    timezone: 'America/Mexico_City',
    isActive: false,
    createdAt: '2026-08-14T00:00:00Z',
    updatedAt: '2026-08-14T00:00:00Z',
    isPrimary: false,
  },
];

describe('BranchesListPage', () => {
  let component: BranchesListPage;
  let fixture: ComponentFixture<BranchesListPage>;
  let branchesServiceMock: {
    findAll: ReturnType<typeof vi.fn>;
  };
  let branchContextServiceMock: {
    loadBranches: ReturnType<typeof vi.fn>;
  };
  let tenantContextStoreMock: {
    hasCapability: ReturnType<typeof vi.fn>;
    snapshot: ReturnType<typeof signal>;
  };
  let snapshotSignal: ReturnType<typeof signal>;
  let dialogMock: {
    open: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    branchesServiceMock = {
      findAll: vi.fn().mockReturnValue(of(mockBranches)),
    };
    branchContextServiceMock = {
      loadBranches: vi.fn().mockResolvedValue(mockBranches),
    };
    snapshotSignal = signal<any>({ membership: { role: 'ADMIN' } });
    tenantContextStoreMock = {
      hasCapability: vi.fn().mockReturnValue(true),
      snapshot: snapshotSignal,
    };
    dialogMock = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(undefined),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [BranchesListPage],
      providers: [
        { provide: BranchesService, useValue: branchesServiceMock },
        { provide: BranchContextService, useValue: branchContextServiceMock },
        { provide: TenantContextStore, useValue: tenantContextStoreMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: ActivatedRoute, useValue: {} },
      ],
    })
      .overrideComponent(BranchesListPage, {
        set: {
          providers: [{ provide: MatDialog, useValue: dialogMock }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BranchesListPage);
    component = fixture.componentInstance;
    await component.loadBranches();
    fixture.detectChanges();
  });

  it('loads and displays branches in table', () => {
    expect(component.viewState()).toBe('loaded');
    expect(component.branches().length).toBe(2);
    expect(component.summary()).toEqual({
      total: 2,
      active: 1,
      inactive: 1,
    });
  });

  it('filters branches by search query', () => {
    component.searchTerm.set('Guadalajara');
    fixture.detectChanges();

    expect(component.filteredBranches().length).toBe(1);
    expect(component.filteredBranches()[0].code).toBe('GDL-SUR');
  });

  it('opens create dialog on action button click', () => {
    component.openCreateDialog();
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('opens edit dialog on action click', () => {
    component.openEditDialog(mockBranches[0]);
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('opens assign dialog on action click', () => {
    component.openAssignDialog(mockBranches[0]);
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('opens schedule dialog on action click', () => {
    component.openScheduleDialog(mockBranches[0]);
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('opens delete dialog on action click', () => {
    component.openDeleteDialog(mockBranches[0]);
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('evaluates canManage true for OWNER role', () => {
    snapshotSignal.set({
      membership: { role: 'OWNER' },
    });
    expect(component.canManage()).toBe(true);
  });

  it('renders action buttons in table rows when canManage is true', () => {
    snapshotSignal.set({
      membership: { role: 'ADMIN' },
    });
    fixture.detectChanges();

    const hostEl: HTMLElement = fixture.nativeElement;
    const actionRows = hostEl.querySelectorAll('.branches-actions');
    expect(actionRows.length).toBe(2);

    const firstRowButtons = actionRows[0].querySelectorAll('button');
    expect(firstRowButtons.length).toBe(4); // Schedule, Assign, Edit, Delete
  });

  it('handles error state when API fails', async () => {
    branchesServiceMock.findAll.mockReturnValue(throwError(() => new Error('Failed to load')));

    await component.loadBranches();

    expect(component.viewState()).toBe('error');
    expect(component.errorMessage()).toContain('No fue posible cargar las sedes');
  });
});
