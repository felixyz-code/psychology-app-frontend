import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import {
  AssignUserBranchDto,
  Branch,
  CreateBranchDto,
  UpdateBranchDto,
  UserBranchAccess,
} from '../models/branch.models';
import { BranchesService } from './branches.service';

const mockBranch: Branch = {
  id: 'branch-1',
  organizationId: 'org-1',
  name: 'Sede Central',
  code: 'SEDE-01',
  address: 'Av. Insurgentes 123',
  phone: '+525512345678',
  timezone: 'America/Mexico_City',
  isActive: true,
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
};

const mockUserAccess: UserBranchAccess = {
  id: 'access-1',
  organizationId: 'org-1',
  userId: 'user-1',
  branchId: 'branch-1',
  isPrimary: true,
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
};

describe('BranchesService', () => {
  let service: BranchesService;
  let httpTesting: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/enterprise/branches`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BranchesService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BranchesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('creates a new branch via POST', () => {
    const dto: CreateBranchDto = {
      name: 'Sede Norte',
      code: 'SEDE-NORTE',
      timezone: 'America/Mexico_City',
    };

    service.create(dto).subscribe((branch) => {
      expect(branch).toEqual(mockBranch);
    });

    const req = httpTesting.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockBranch);
  });

  it('lists all branches with optional includeInactive query parameter', () => {
    service.findAll({ includeInactive: true }).subscribe((branches) => {
      expect(branches).toEqual([mockBranch]);
    });

    const req = httpTesting.expectOne(`${baseUrl}?includeInactive=true`);
    expect(req.request.method).toBe('GET');
    req.flush([mockBranch]);
  });

  it('retrieves user branch assignments via /me/accesses', () => {
    service.getMyBranches().subscribe((accesses) => {
      expect(accesses).toEqual([mockUserAccess]);
    });

    const req = httpTesting.expectOne(`${baseUrl}/me/accesses`);
    expect(req.request.method).toBe('GET');
    req.flush([mockUserAccess]);
  });

  it('finds single branch by id', () => {
    service.findOne('branch-1').subscribe((branch) => {
      expect(branch).toEqual(mockBranch);
    });

    const req = httpTesting.expectOne(`${baseUrl}/branch-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockBranch);
  });

  it('updates branch details via PATCH', () => {
    const dto: UpdateBranchDto = { name: 'Sede Central Renovada' };

    service.update('branch-1', dto).subscribe((branch) => {
      expect(branch.name).toBe('Sede Central Renovada');
    });

    const req = httpTesting.expectOne(`${baseUrl}/branch-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(dto);
    req.flush({ ...mockBranch, name: 'Sede Central Renovada' });
  });

  it('removes a branch via DELETE', () => {
    service.remove('branch-1').subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpTesting.expectOne(`${baseUrl}/branch-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
  });

  it('assigns user to branch via POST :id/users', () => {
    const dto: AssignUserBranchDto = { userId: 'user-1', isPrimary: true };

    service.assignUser('branch-1', dto).subscribe((res) => {
      expect(res).toEqual(mockUserAccess);
    });

    const req = httpTesting.expectOne(`${baseUrl}/branch-1/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockUserAccess);
  });

  it('removes user branch access via DELETE :id/users/:userId', () => {
    service.removeUserAccess('branch-1', 'user-1').subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpTesting.expectOne(`${baseUrl}/branch-1/users/user-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
  });

  it('gets assigned users for a branch via GET :id/users', () => {
    service.getBranchUsers('branch-1').subscribe((users) => {
      expect(users).toEqual([mockUserAccess]);
    });

    const req = httpTesting.expectOne(`${baseUrl}/branch-1/users`);
    expect(req.request.method).toBe('GET');
    req.flush([mockUserAccess]);
  });

  it('gets assigned professionals and schedules via GET :id/professionals', () => {
    const mockProfSchedule = [
      {
        id: 'access-1',
        organizationId: 'org-1',
        branchId: 'branch-1',
        userId: 'user-1',
        isPrimary: true,
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
      },
    ];

    service.getBranchProfessionals('branch-1').subscribe((profs) => {
      expect(profs).toEqual(mockProfSchedule);
    });

    const req = httpTesting.expectOne(`${baseUrl}/branch-1/professionals`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProfSchedule);
  });

  it('assigns professional with schedules via POST :id/professionals', () => {
    const dto = {
      userId: 'user-1',
      isPrimary: true,
      schedules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }],
    };

    const mockResponse = {
      id: 'access-1',
      organizationId: 'org-1',
      branchId: 'branch-1',
      userId: 'user-1',
      isPrimary: true,
      schedules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }],
    };

    service.assignProfessional('branch-1', dto).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne(`${baseUrl}/branch-1/professionals`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockResponse);
  });

  it('updates professional schedule via PUT :id/professionals/:userId/schedule', () => {
    const dto = {
      schedules: [
        { dayOfWeek: 2, startTime: '10:00', endTime: '18:00', durationSlotMinutes: 60 },
      ],
    };

    service.updateProfessionalSchedule('branch-1', 'user-1', dto).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
    });

    const req = httpTesting.expectOne(`${baseUrl}/branch-1/professionals/user-1/schedule`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush({ success: true, count: 1 });
  });

  it('removes professional from branch via DELETE :id/professionals/:userId', () => {
    service.removeProfessional('branch-1', 'user-1').subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpTesting.expectOne(`${baseUrl}/branch-1/professionals/user-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: 'Professional removed' });
  });
});
