import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminTenantItem } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';
import {
  GrantLifetimeDialogComponent,
  GrantLifetimeDialogData,
} from './grant-lifetime-dialog.component';

describe('GrantLifetimeDialogComponent', () => {
  let component: GrantLifetimeDialogComponent;
  let fixture: ComponentFixture<GrantLifetimeDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockService: { grantLifetime: ReturnType<typeof vi.fn> };

  const mockTenant: AdminTenantItem = {
    id: 'org-alliance',
    slug: 'org-alliance',
    displayName: 'Alianza Salud Mental',
    legalName: 'Alianza AC',
    status: 'ACTIVE',
    timezone: 'America/Hermosillo',
    createdAt: '2026-01-01T00:00:00Z',
    subscription: {
      id: 'sub-test',
      status: 'TRIALING',
      planTier: 'PROFESSIONAL',
      planCode: 'pro-monthly',
      planName: 'Profesional',
      isExempt: false,
      sponsorNotes: 'Convenio previo',
      customTherapistsLimit: 10,
    },
    usage: {
      therapistsCount: 2,
      patientsCount: 20,
      branchesCount: 1,
      therapistsLimit: 10,
      patientsLimit: 100,
      branchesLimit: 2,
    },
  };

  const dialogData: GrantLifetimeDialogData = {
    tenant: mockTenant,
  };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockService = { grantLifetime: vi.fn(() => of({})) };

    await TestBed.configureTestingModule({
      imports: [GrantLifetimeDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: SuperadminTenantsService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GrantLifetimeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('populates form with initial subscription data', () => {
    expect(component.form.value.sponsorNotes).toBe('Convenio previo');
    expect(component.form.value.customTherapistsLimit).toBe(10);
  });

  it('submits grant lifetime payload and closes on success', () => {
    component.form.patchValue({
      sponsorNotes: 'Convenio Institucional AC',
      customTherapistsLimit: 25,
      customPatientsLimit: 1000,
      customBranchesLimit: 5,
    });

    component.submit();

    expect(mockService.grantLifetime).toHaveBeenCalledWith('org-alliance', {
      sponsorNotes: 'Convenio Institucional AC',
      customTherapistsLimit: 25,
      customPatientsLimit: 1000,
      customBranchesLimit: 5,
    });
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('handles error response gracefully', () => {
    mockService.grantLifetime.mockReturnValue(
      throwError(() => ({ error: { message: 'Lifetime grant error' } })),
    );

    component.submit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Lifetime grant error');
  });

  it('cancels without submitting', () => {
    component.cancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
    expect(mockService.grantLifetime).not.toHaveBeenCalled();
  });
});
