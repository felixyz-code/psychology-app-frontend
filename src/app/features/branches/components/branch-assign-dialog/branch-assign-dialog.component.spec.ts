import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { Branch, UserBranchAccess } from '../../../../core/models/branch.models';
import { BranchesService } from '../../../../core/services/branches.service';
import { MembershipsService } from '../../../membership-administration/services/memberships.service';
import { TenantContextStore } from '../../../../core/tenant-context/tenant-context.store';
import { MembershipListItem } from '../../../membership-administration/models/membership.models';
import {
  BranchAssignDialogComponent,
  BranchAssignDialogData,
} from './branch-assign-dialog.component';

const mockBranch: Branch = {
  id: 'branch-1',
  organizationId: 'org-1',
  name: 'Sede Central',
  code: 'CENTRO',
  timezone: 'America/Mexico_City',
  isActive: true,
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
};

const mockMembers: MembershipListItem[] = [
  {
    id: 'mem-1',
    userId: 'user-1',
    displayName: 'Dra. Rivera',
    email: 'rivera@example.com',
    role: 'PSYCHOLOGIST',
    status: 'ACTIVE',
    joinedAt: null,
    suspendedAt: null,
    revokedAt: null,
    createdAt: '2026-08-14T00:00:00Z',
    updatedAt: '2026-08-14T00:00:00Z',
    allowedActions: ['CHANGE_ROLE'],
  },
  {
    id: 'mem-2',
    userId: 'user-2',
    displayName: 'Carlos Recepción',
    email: 'carlos@example.com',
    role: 'RECEPTIONIST',
    status: 'ACTIVE',
    joinedAt: null,
    suspendedAt: null,
    revokedAt: null,
    createdAt: '2026-08-14T00:00:00Z',
    updatedAt: '2026-08-14T00:00:00Z',
    allowedActions: ['CHANGE_ROLE'],
  },
];

const mockBranchUsers: UserBranchAccess[] = [
  {
    id: 'acc-1',
    organizationId: 'org-1',
    userId: 'user-1',
    branchId: 'branch-1',
    isPrimary: true,
    createdAt: '2026-08-14T00:00:00Z',
    updatedAt: '2026-08-14T00:00:00Z',
  },
];

describe('BranchAssignDialogComponent', () => {
  let component: BranchAssignDialogComponent;
  let fixture: ComponentFixture<BranchAssignDialogComponent>;
  let branchesServiceMock: {
    getBranchUsers: ReturnType<typeof vi.fn>;
    assignUser: ReturnType<typeof vi.fn>;
    removeUserAccess: ReturnType<typeof vi.fn>;
  };
  let membershipsServiceMock: {
    list: ReturnType<typeof vi.fn>;
  };
  let tenantContextStoreMock: {
    selectedOrganizationId: ReturnType<typeof vi.fn>;
  };
  let dialogRefMock: {
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    branchesServiceMock = {
      getBranchUsers: vi.fn().mockReturnValue(of(mockBranchUsers)),
      assignUser: vi.fn().mockReturnValue(of(mockBranchUsers[0])),
      removeUserAccess: vi.fn().mockReturnValue(of({ success: true })),
    };

    membershipsServiceMock = {
      list: vi.fn().mockReturnValue(of(mockMembers)),
    };

    tenantContextStoreMock = {
      selectedOrganizationId: vi.fn().mockReturnValue('org-1'),
    };

    dialogRefMock = {
      close: vi.fn(),
    };

    const dialogData: BranchAssignDialogData = { branch: mockBranch };

    await TestBed.configureTestingModule({
      imports: [BranchAssignDialogComponent],
      providers: [
        { provide: BranchesService, useValue: branchesServiceMock },
        { provide: MembershipsService, useValue: membershipsServiceMock },
        { provide: TenantContextStore, useValue: tenantContextStoreMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BranchAssignDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads member items and maps existing branch accesses correctly', () => {
    expect(component.isLoading()).toBe(false);
    expect(component.items().length).toBe(2);

    const user1 = component.items().find((i) => i.userId === 'user-1');
    const user2 = component.items().find((i) => i.userId === 'user-2');

    expect(user1?.isAssigned).toBe(true);
    expect(user1?.isPrimary).toBe(true);

    expect(user2?.isAssigned).toBe(false);
    expect(user2?.isPrimary).toBe(false);
  });

  it('assigns user access when toggled on', async () => {
    const user2 = component.items().find((i) => i.userId === 'user-2')!;

    await component.toggleAssignment(user2, true);

    expect(branchesServiceMock.assignUser).toHaveBeenCalledWith('branch-1', {
      userId: 'user-2',
      isPrimary: false,
    });
    expect(component.items().find((i) => i.userId === 'user-2')?.isAssigned).toBe(true);
  });

  it('revokes user access when toggled off', async () => {
    const user1 = component.items().find((i) => i.userId === 'user-1')!;

    await component.toggleAssignment(user1, false);

    expect(branchesServiceMock.removeUserAccess).toHaveBeenCalledWith('branch-1', 'user-1');
    expect(component.items().find((i) => i.userId === 'user-1')?.isAssigned).toBe(false);
  });

  it('toggles primary branch flag', async () => {
    const user1 = component.items().find((i) => i.userId === 'user-1')!;

    await component.togglePrimary(user1, false);

    expect(branchesServiceMock.assignUser).toHaveBeenCalledWith('branch-1', {
      userId: 'user-1',
      isPrimary: false,
    });
    expect(component.items().find((i) => i.userId === 'user-1')?.isPrimary).toBe(false);
  });
});
