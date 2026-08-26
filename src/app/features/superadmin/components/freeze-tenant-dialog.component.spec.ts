import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminTenantItem } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';
import {
  FreezeTenantDialogComponent,
  FreezeTenantDialogData,
} from './freeze-tenant-dialog.component';

describe('FreezeTenantDialogComponent', () => {
  let component: FreezeTenantDialogComponent;
  let fixture: ComponentFixture<FreezeTenantDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockService: { freezeTenant: ReturnType<typeof vi.fn> };

  const mockTenant: AdminTenantItem = {
    id: 'org-freeze-test',
    slug: 'org-freeze-test',
    displayName: 'Freeze Test Clinic',
    legalName: 'Freeze Legal',
    status: 'ACTIVE',
    timezone: 'America/Hermosillo',
    createdAt: '2026-01-01T00:00:00Z',
    subscription: {
      id: 'sub-active',
      status: 'ACTIVE',
      planTier: 'PROFESSIONAL',
      planCode: 'pro-monthly',
      planName: 'Profesional',
      isExempt: false,
    },
    usage: {
      therapistsCount: 1,
      patientsCount: 5,
      branchesCount: 1,
      therapistsLimit: 1,
      patientsLimit: 50,
      branchesLimit: 1,
    },
  };

  describe('Freezing an active tenant', () => {
    const dialogData: FreezeTenantDialogData = {
      tenant: mockTenant,
      isCurrentlyFrozen: false,
    };

    beforeEach(async () => {
      mockDialogRef = { close: vi.fn() };
      mockService = {
        freezeTenant: vi.fn(() =>
          of({ success: true, isFrozen: true, message: 'Frozen' }),
        ),
      };

      await TestBed.configureTestingModule({
        imports: [FreezeTenantDialogComponent],
        providers: [
          { provide: MAT_DIALOG_DATA, useValue: dialogData },
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: SuperadminTenantsService, useValue: mockService },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(FreezeTenantDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('submits freeze=true with reason and closes on success', () => {
      component.form.patchValue({ reason: 'Auditoría preventiva' });
      component.submit();

      expect(mockService.freezeTenant).toHaveBeenCalledWith('org-freeze-test', {
        freeze: true,
        reason: 'Auditoría preventiva',
      });
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('handles freeze error gracefully', () => {
      mockService.freezeTenant.mockReturnValue(
        throwError(() => ({ error: { message: 'Freeze operation failed' } })),
      );

      component.submit();

      expect(component.isLoading()).toBe(false);
      expect(component.errorMessage()).toBe('Freeze operation failed');
    });

    it('cancels dialog without submitting', () => {
      component.cancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith();
      expect(mockService.freezeTenant).not.toHaveBeenCalled();
    });
  });

  describe('Unfreezing a frozen tenant', () => {
    const dialogData: FreezeTenantDialogData = {
      tenant: {
        ...mockTenant,
        subscription: {
          ...mockTenant.subscription!,
          status: 'FROZEN',
        },
      },
      isCurrentlyFrozen: true,
    };

    beforeEach(async () => {
      mockDialogRef = { close: vi.fn() };
      mockService = {
        freezeTenant: vi.fn(() =>
          of({ success: true, isFrozen: false, message: 'Unfrozen' }),
        ),
      };

      await TestBed.configureTestingModule({
        imports: [FreezeTenantDialogComponent],
        providers: [
          { provide: MAT_DIALOG_DATA, useValue: dialogData },
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: SuperadminTenantsService, useValue: mockService },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(FreezeTenantDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('submits freeze=false and closes on success', () => {
      component.form.patchValue({ reason: 'Reactivación tras validación' });
      component.submit();

      expect(mockService.freezeTenant).toHaveBeenCalledWith('org-freeze-test', {
        freeze: false,
        reason: 'Reactivación tras validación',
      });
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });
  });
});
