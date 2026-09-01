import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { QuotaExceededDetails } from './billing.models';
import { UpgradePlanDialogComponent } from '../../features/billing/components/upgrade-plan-dialog/upgrade-plan-dialog.component';

@Injectable({ providedIn: 'root' })
export class QuotaPaywallDialogService {
  private readonly dialog = inject(MatDialog);
  private currentDialogRef: MatDialogRef<UpgradePlanDialogComponent> | null = null;

  openQuotaExceededDialog(
    details: QuotaExceededDetails,
  ): MatDialogRef<UpgradePlanDialogComponent> | null {
    if (this.currentDialogRef) {
      return this.currentDialogRef;
    }

    this.currentDialogRef = this.dialog.open(UpgradePlanDialogComponent, {
      data: { details },
      width: '520px',
      maxWidth: '95vw',
      disableClose: false,
      autoFocus: 'first-tabbable',
    });

    this.currentDialogRef.afterClosed().subscribe(() => {
      this.currentDialogRef = null;
    });

    return this.currentDialogRef;
  }

  isDialogOpen(): boolean {
    return this.currentDialogRef !== null;
  }
}
