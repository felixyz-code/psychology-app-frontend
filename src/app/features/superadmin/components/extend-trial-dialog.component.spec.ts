import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminTenantItem } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';
import {
  ExtendTrialDialogComponent,
  ExtendTrialDialogData,
} from './extend-trial-dialog.component';

describe('ExtendTrialDialogComponent', () => {
  let component: ExtendTrialDialogComponent;
  let fixture: ComponentFixture<ExtendTrialDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockService: { extendTrial: ReturnType<typeof vi.fn> };

  const mockTenant: AdminTenantItem = {
    id: 'org-test',
    slug: 'org-test',
    displayName: 'Test Clinic',
    legalName: 'Test Legal',
    status: 'ACTIVE',
    timezone: 'America/Hermosillo',
    createdAt: '2026-01-01T00:00:00Z',
    usage: {
      therapistsCount: 1,
      patientsCount: 1,
      branchesCount: 1,
      therapistsLimit: 1,
      patientsLimit: 10,
      branchesLimit: 1,
    },
  };

  const dialogData: ExtendTrialDialogData = {
    tenant: mockTenant,
  };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockService = { extendTrial: vi.fn(() => of({})) };

    await TestBed.configureTestingModule({
      imports: [ExtendTrialDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: SuperadminTenantsService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExtendTrialDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes with default preset (14 days)', () => {
    expect(component.form.value.presetDays).toBe(14);
    expect(component.form.value.customDays).toBe(14);
  });

  it('updates custom days on preset selection', () => {
    component.onPresetChange(30);
    expect(component.isCustom()).toBe(false);
    expect(component.form.value.customDays).toBe(30);

    component.onPresetChange('custom');
    expect(component.isCustom()).toBe(true);
  });

  it('submits extend trial payload and closes on success', () => {
    component.form.patchValue({ customDays: 21 });
    component.submit();

    expect(mockService.extendTrial).toHaveBeenCalledWith('org-test', {
      daysToAdd: 21,
    });
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('handles submission error gracefully', () => {
    mockService.extendTrial.mockReturnValue(
      throwError(() => ({ error: { message: 'Extension failed' } })),
    );

    component.submit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Extension failed');
  });

  it('cancels dialog without submitting', () => {
    component.cancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
    expect(mockService.extendTrial).not.toHaveBeenCalled();
  });
});
