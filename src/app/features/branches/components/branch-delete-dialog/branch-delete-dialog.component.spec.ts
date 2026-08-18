import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { Branch } from '../../../../core/models/branch.models';
import { BranchesService } from '../../../../core/services/branches.service';
import {
  BranchDeleteDialogComponent,
  BranchDeleteDialogData,
} from './branch-delete-dialog.component';

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

describe('BranchDeleteDialogComponent', () => {
  let component: BranchDeleteDialogComponent;
  let fixture: ComponentFixture<BranchDeleteDialogComponent>;
  let branchesServiceMock: {
    remove: ReturnType<typeof vi.fn>;
  };
  let dialogRefMock: {
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    branchesServiceMock = {
      remove: vi.fn().mockReturnValue(of({ success: true })),
    };

    dialogRefMock = {
      close: vi.fn(),
    };

    const dialogData: BranchDeleteDialogData = { branch: mockBranch };

    await TestBed.configureTestingModule({
      imports: [BranchDeleteDialogComponent],
      providers: [
        { provide: BranchesService, useValue: branchesServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BranchDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('confirms and calls remove on BranchesService', () => {
    component.confirmDelete();

    expect(branchesServiceMock.remove).toHaveBeenCalledWith('branch-1');
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('handles CANNOT_DELETE_ONLY_BRANCH error with explanatory message', () => {
    const error = new HttpErrorResponse({
      status: 403,
      error: {
        code: 'CANNOT_DELETE_ONLY_BRANCH',
        message: 'Cannot delete the only active branch',
      },
    });
    branchesServiceMock.remove.mockReturnValue(throwError(() => error));

    component.confirmDelete();

    expect(component.isOnlyBranchError()).toBe(true);
    expect(component.errorMessage()).toContain('única sede activa');
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});
