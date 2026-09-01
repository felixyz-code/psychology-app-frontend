import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import {
  UpgradePlanDialogComponent,
  UpgradePlanDialogData,
} from './upgrade-plan-dialog.component';

describe('UpgradePlanDialogComponent', () => {
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  const testData: UpgradePlanDialogData = {
    details: {
      statusCode: 402,
      error: 'QUOTA_EXCEEDED',
      code: 'QUOTA_EXCEEDED',
      resource: 'THERAPISTS',
      currentUsage: 3,
      maxAllowed: 3,
      currentTier: 'STARTER',
      suggestedTier: 'PRO',
      message: 'Límite de terapeutas alcanzado.',
    },
  };

  beforeEach(() => {
    mockDialogRef = { close: vi.fn() };
    mockRouter = { navigate: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [UpgradePlanDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: testData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should create and format resource labels correctly', () => {
    const fixture = TestBed.createComponent(UpgradePlanDialogComponent);
    const component = fixture.componentInstance;

    expect(component.getResourceLabel('THERAPISTS')).toBe('Terapeutas Profesionales');
    expect(component.getResourceLabel('BRANCHES')).toBe('Sedes / Sucursales Clínicas');
    expect(component.getResourceLabel('NOTIFICATIONS')).toBe('Notificaciones y Recordatorios Mensuales');
    expect(component.getResourceLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('should return appropriate icon for each resource type', () => {
    const fixture = TestBed.createComponent(UpgradePlanDialogComponent);
    const component = fixture.componentInstance;

    expect(component.getResourceIcon('THERAPISTS')).toBe('groups');
    expect(component.getResourceIcon('BRANCHES')).toBe('apartment');
    expect(component.getResourceIcon('NOTIFICATIONS')).toBe('notifications_active');
    expect(component.getResourceIcon('UNKNOWN')).toBe('lock');
  });

  it('should close dialog and navigate to /billing when goToBilling is invoked', () => {
    const fixture = TestBed.createComponent(UpgradePlanDialogComponent);
    const component = fixture.componentInstance;

    component.goToBilling();

    expect(mockDialogRef.close).toHaveBeenCalledWith('navigate_to_billing');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/billing']);
  });

  it('should close dialog when close is invoked', () => {
    const fixture = TestBed.createComponent(UpgradePlanDialogComponent);
    const component = fixture.componentInstance;

    component.close();

    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
