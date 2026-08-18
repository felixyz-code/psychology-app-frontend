import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { Branch } from '../../../../core/models/branch.models';
import { BranchesService } from '../../../../core/services/branches.service';
import { BranchFormDialogComponent, BranchFormDialogData } from './branch-form-dialog.component';

const mockBranch: Branch = {
  id: 'branch-1',
  organizationId: 'org-1',
  name: 'Sede Central',
  code: 'CENTRO',
  address: 'Av. Principal 100',
  phone: '5512345678',
  timezone: 'America/Mexico_City',
  isActive: true,
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
};

describe('BranchFormDialogComponent', () => {
  let component: BranchFormDialogComponent;
  let fixture: ComponentFixture<BranchFormDialogComponent>;
  let branchesServiceMock: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let dialogRefMock: {
    close: ReturnType<typeof vi.fn>;
  };
  let dialogData: BranchFormDialogData;

  const createComponent = async (data: BranchFormDialogData) => {
    dialogData = data;
    branchesServiceMock = {
      create: vi.fn().mockReturnValue(of(mockBranch)),
      update: vi.fn().mockReturnValue(of(mockBranch)),
    };
    dialogRefMock = {
      close: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BranchFormDialogComponent],
      providers: [
        { provide: BranchesService, useValue: branchesServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BranchFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('Create Mode', () => {
    beforeEach(async () => {
      await createComponent({ mode: 'create' });
    });

    it('initializes form with empty/default fields', () => {
      expect(component.isEdit).toBe(false);
      expect(component.form.controls.name.value).toBe('');
      expect(component.form.controls.code.value).toBe('');
      expect(component.form.controls.timezone.value).toBe('America/Mexico_City');
      expect(component.form.controls.isActive.value).toBe(true);
    });

    it('submits create payload when valid', () => {
      component.form.patchValue({
        name: 'Sede Oriente',
        code: 'ORIENTE',
        address: 'Calle 10',
        phone: '5588776655',
        timezone: 'America/Mexico_City',
        isActive: true,
      });

      component.submit();

      expect(branchesServiceMock.create).toHaveBeenCalledWith({
        name: 'Sede Oriente',
        code: 'ORIENTE',
        address: 'Calle 10',
        phone: '5588776655',
        timezone: 'America/Mexico_City',
        isActive: true,
      });
      expect(dialogRefMock.close).toHaveBeenCalledWith(mockBranch);
    });

    it('handles BRANCH_CODE_EXISTS (409) conflict error', () => {
      const errorResponse = new HttpErrorResponse({
        status: 409,
        error: { code: 'BRANCH_CODE_EXISTS', message: 'Branch code already exists' },
      });
      branchesServiceMock.create.mockReturnValue(throwError(() => errorResponse));

      component.form.patchValue({
        name: 'Sede Duplicada',
        code: 'CENTRO',
      });

      component.submit();

      expect(component.form.controls.code.hasError('codeExists')).toBe(true);
      expect(component.errorMessage()).toContain('ya existe');
    });

    it('handles PLAN_LIMIT_EXCEEDED (403) quota limit error', () => {
      const errorResponse = new HttpErrorResponse({
        status: 403,
        error: { code: 'PLAN_LIMIT_EXCEEDED', message: 'Plan quota exceeded' },
      });
      branchesServiceMock.create.mockReturnValue(throwError(() => errorResponse));

      component.form.patchValue({
        name: 'Sede Extra',
        code: 'EXTRA',
      });

      component.submit();

      expect(component.planLimitReached()).toBe(true);
      expect(component.errorMessage()).toContain('límite de sedes');
    });
  });

  describe('Edit Mode', () => {
    beforeEach(async () => {
      await createComponent({ mode: 'edit', branch: mockBranch });
    });

    it('populates form with existing branch data', () => {
      expect(component.isEdit).toBe(true);
      expect(component.form.controls.name.value).toBe('Sede Central');
      expect(component.form.controls.code.value).toBe('CENTRO');
      expect(component.form.controls.address.value).toBe('Av. Principal 100');
    });

    it('submits update payload on edit', () => {
      component.form.patchValue({
        name: 'Sede Central Modificada',
      });

      component.submit();

      expect(branchesServiceMock.update).toHaveBeenCalledWith('branch-1', {
        name: 'Sede Central Modificada',
        code: 'CENTRO',
        address: 'Av. Principal 100',
        phone: '5512345678',
        timezone: 'America/Mexico_City',
        isActive: true,
      });
      expect(dialogRefMock.close).toHaveBeenCalledWith(mockBranch);
    });
  });
});
