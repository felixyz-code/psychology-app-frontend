import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminTenantItem } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';
import {
  AdjustQuotasDialogComponent,
  AdjustQuotasDialogData,
} from './adjust-quotas-dialog.component';

describe('AdjustQuotasDialogComponent', () => {
  let component: AdjustQuotasDialogComponent;
  let fixture: ComponentFixture<AdjustQuotasDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockService: { updateQuotas: ReturnType<typeof vi.fn> };

  const mockTenant: AdminTenantItem = {
    id: 'org-quotas',
    slug: 'org-quotas',
    displayName: 'Quotas Clinic',
    legalName: 'Quotas Legal',
    status: 'ACTIVE',
    timezone: 'America/Hermosillo',
    createdAt: '2026-01-01T00:00:00Z',
    subscription: {
      id: 'sub-quotas',
      status: 'ACTIVE',
      planTier: 'ENTERPRISE',
      planCode: 'enterprise-allied',
      planName: 'Enterprise',
      isExempt: true,
      customTherapistsLimit: 15,
      customPatientsLimit: 300,
      customBranchesLimit: 2,
    },
    usage: {
      therapistsCount: 3,
      patientsCount: 50,
      branchesCount: 1,
      therapistsLimit: 15,
      patientsLimit: 300,
      branchesLimit: 2,
    },
  };

  const dialogData: AdjustQuotasDialogData = {
    tenant: mockTenant,
  };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockService = { updateQuotas: vi.fn(() => of({})) };

    await TestBed.configureTestingModule({
      imports: [AdjustQuotasDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: SuperadminTenantsService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdjustQuotasDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('populates form with current custom quota limits', () => {
    expect(component.form.value.customTherapistsLimit).toBe(15);
    expect(component.form.value.customPatientsLimit).toBe(300);
    expect(component.form.value.customBranchesLimit).toBe(2);
  });

  it('submits updated quota values and closes on success', () => {
    component.form.patchValue({
      customTherapistsLimit: 50,
      customPatientsLimit: -1,
      customBranchesLimit: 10,
    });

    component.submit();

    expect(mockService.updateQuotas).toHaveBeenCalledWith('org-quotas', {
      customTherapistsLimit: 50,
      customPatientsLimit: -1,
      customBranchesLimit: 10,
    });
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('handles submission errors gracefully', () => {
    mockService.updateQuotas.mockReturnValue(
      throwError(() => ({ error: { message: 'Quota update rejected' } })),
    );

    component.submit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Quota update rejected');
  });

  it('cancels dialog without submitting', () => {
    component.cancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
    expect(mockService.updateQuotas).not.toHaveBeenCalled();
  });
});
