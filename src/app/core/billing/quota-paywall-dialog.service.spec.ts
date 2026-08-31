import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { QuotaExceededDetails } from './billing.models';
import { QuotaPaywallDialogService } from './quota-paywall-dialog.service';
import { UpgradePlanDialogComponent } from '../../features/billing/components/upgrade-plan-dialog/upgrade-plan-dialog.component';

describe('QuotaPaywallDialogService', () => {
  let service: QuotaPaywallDialogService;
  let mockDialog: {
    open: ReturnType<typeof vi.fn>;
  };
  let afterClosedSubject: Subject<void>;

  const testDetails: QuotaExceededDetails = {
    statusCode: 402,
    error: 'QUOTA_EXCEEDED',
    code: 'QUOTA_EXCEEDED',
    resource: 'THERAPISTS',
    currentUsage: 3,
    maxAllowed: 3,
    currentTier: 'STARTER',
    suggestedTier: 'PRO',
  };

  beforeEach(() => {
    afterClosedSubject = new Subject<void>();
    const mockDialogRef = {
      afterClosed: vi.fn(() => afterClosedSubject.asObservable()),
    };

    mockDialog = {
      open: vi.fn().mockReturnValue(mockDialogRef),
    };

    TestBed.configureTestingModule({
      providers: [
        QuotaPaywallDialogService,
        { provide: MatDialog, useValue: mockDialog },
      ],
    });

    service = TestBed.inject(QuotaPaywallDialogService);
  });

  it('should open UpgradePlanDialogComponent when openQuotaExceededDialog is called', () => {
    const dialogRef = service.openQuotaExceededDialog(testDetails);

    expect(mockDialog.open).toHaveBeenCalledWith(
      UpgradePlanDialogComponent,
      expect.objectContaining({
        data: { details: testDetails },
      }),
    );
    expect(service.isDialogOpen()).toBe(true);
    expect(dialogRef).toBeDefined();
  });

  it('should not open a second dialog if one is already open', () => {
    service.openQuotaExceededDialog(testDetails);
    expect(mockDialog.open).toHaveBeenCalledTimes(1);

    service.openQuotaExceededDialog(testDetails);
    expect(mockDialog.open).toHaveBeenCalledTimes(1);
  });

  it('should allow opening a new dialog after previous one is closed', () => {
    service.openQuotaExceededDialog(testDetails);
    expect(service.isDialogOpen()).toBe(true);

    afterClosedSubject.next();
    afterClosedSubject.complete();

    expect(service.isDialogOpen()).toBe(false);

    service.openQuotaExceededDialog(testDetails);
    expect(mockDialog.open).toHaveBeenCalledTimes(2);
  });
});
