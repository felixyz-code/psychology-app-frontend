import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { Branch, BranchProfessionalScheduleItem } from '../../../../core/models/branch.models';
import { BranchesService } from '../../../../core/services/branches.service';
import { MembershipsService } from '../../../membership-administration/services/memberships.service';
import { TenantContextStore } from '../../../../core/tenant-context/tenant-context.store';
import { BranchScheduleDialogComponent } from './branch-schedule-dialog.component';

const mockBranch: Branch = {
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

const mockProfessional: BranchProfessionalScheduleItem = {
  id: 'access-1',
  organizationId: 'org-1',
  branchId: 'branch-1',
  userId: 'user-1',
  isPrimary: true,
  user: {
    id: 'user-1',
    name: 'Dr. Alejandro Gomez',
    displayName: 'Dr. Alejandro Gomez',
    email: 'alejandro@clinic.com',
    role: 'PSYCHOLOGIST',
  },
  schedules: [
    {
      id: 'slot-1',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '14:00',
      durationSlotMinutes: 60,
      isActive: true,
    },
  ],
};

describe('BranchScheduleDialogComponent', () => {
  let component: BranchScheduleDialogComponent;
  let fixture: ComponentFixture<BranchScheduleDialogComponent>;

  let branchesServiceMock: {
    getBranchProfessionals: ReturnType<typeof vi.fn>;
    updateProfessionalSchedule: ReturnType<typeof vi.fn>;
    assignProfessional: ReturnType<typeof vi.fn>;
    removeProfessional: ReturnType<typeof vi.fn>;
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
      getBranchProfessionals: vi.fn().mockReturnValue(of([mockProfessional])),
      updateProfessionalSchedule: vi.fn().mockReturnValue(of({ success: true, count: 1 })),
      assignProfessional: vi.fn().mockReturnValue(of(mockProfessional)),
      removeProfessional: vi.fn().mockReturnValue(of({ success: true })),
    };

    membershipsServiceMock = {
      list: vi.fn().mockReturnValue(
        of([
          {
            userId: 'user-1',
            displayName: 'Dr. Alejandro Gomez',
            email: 'alejandro@clinic.com',
            role: 'PSYCHOLOGIST',
          },
          {
            userId: 'user-2',
            displayName: 'Dra. Sofia Ramos',
            email: 'sofia@clinic.com',
            role: 'PSYCHOLOGIST',
          },
          {
            userId: 'user-3',
            displayName: 'Recepcionista Juan',
            email: 'juan@clinic.com',
            role: 'RECEPTIONIST',
          },
        ]),
      ),
    };

    tenantContextStoreMock = {
      selectedOrganizationId: vi.fn().mockReturnValue('org-1'),
    };

    dialogRefMock = {
      close: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BranchScheduleDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { branch: mockBranch } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: BranchesService, useValue: branchesServiceMock },
        { provide: MembershipsService, useValue: membershipsServiceMock },
        { provide: TenantContextStore, useValue: tenantContextStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BranchScheduleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads assigned professionals and auto-selects first therapist while filtering clinical roles only', () => {
    expect(branchesServiceMock.getBranchProfessionals).toHaveBeenCalledWith('branch-1');
    expect(component.professionals().length).toBe(1);
    expect(component.selectedProfessionalId()).toBe('user-1');
    expect(component.schedulesFormArray.length).toBe(1);
    expect(component.unassignedStaff().length).toBe(1);
    expect(component.unassignedStaff()[0].userId).toBe('user-2');
  });

  it('adds and removes schedule slots in form array', () => {
    component.addSlotToForm({
      dayOfWeek: 2,
      startTime: '10:00',
      endTime: '15:00',
      durationSlotMinutes: 45,
      isActive: true,
    });

    expect(component.schedulesFormArray.length).toBe(2);

    component.removeSlot(1);
    expect(component.schedulesFormArray.length).toBe(1);
  });

  it('saves updated schedules successfully', async () => {
    await component.saveSchedules();

    expect(branchesServiceMock.updateProfessionalSchedule).toHaveBeenCalledWith(
      'branch-1',
      'user-1',
      expect.objectContaining({
        schedules: [
          expect.objectContaining({
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '14:00',
          }),
        ],
      }),
    );
    expect(component.successMessage()).toContain('Horarios semanales guardados');
  });

  it('validates that startTime is before endTime via validator and prevents saving', async () => {
    const firstSlot = component.schedulesFormArray.at(0);
    firstSlot.patchValue({
      startTime: '15:00',
      endTime: '10:00',
    });

    expect(firstSlot.hasError('invalidTimeRange')).toBe(true);
    expect(component.schedulesFormArray.invalid).toBe(true);

    await component.saveSchedules();

    expect(branchesServiceMock.updateProfessionalSchedule).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('corrige las franjas horarias marcadas en rojo');
  });

  it('assigns new therapist with default schedule', async () => {
    component.newTherapistControl.setValue('user-2');

    await component.assignTherapist();

    expect(branchesServiceMock.assignProfessional).toHaveBeenCalledWith(
      'branch-1',
      expect.objectContaining({
        userId: 'user-2',
      }),
    );
  });

  it('closes dialog', () => {
    component.close();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });
});
