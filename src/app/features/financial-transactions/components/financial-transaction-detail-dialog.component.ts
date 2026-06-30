import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { FinancialTransactionResponse } from '../models/financial-transaction.models';
import { FinancialTransactionDetailContentComponent } from './financial-transaction-detail-content.component';

interface FinancialTransactionDetailDialogData {
  transaction: FinancialTransactionResponse;
}

@Component({
  selector: 'app-financial-transaction-detail-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule, RouterLink, FinancialTransactionDetailContentComponent],
  templateUrl: './financial-transaction-detail-dialog.component.html',
  styleUrl: './financial-transaction-detail-dialog.component.scss',
})
export class FinancialTransactionDetailDialogComponent {
  private readonly data = inject<FinancialTransactionDetailDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<FinancialTransactionDetailDialogComponent>);

  readonly transaction = this.data.transaction;

  close(): void {
    this.dialogRef.close();
  }
}
