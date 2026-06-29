import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

import { FinancialTransactionResponse } from '../models/financial-transaction.models';
import { FinancialTransactionsService } from '../services/financial-transactions.service';

interface FinancialTransactionDeleteDialogData {
  transaction: FinancialTransactionResponse;
}

@Component({
  selector: 'app-financial-transaction-delete-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './financial-transaction-delete-dialog.component.html',
  styleUrl: './financial-transaction-delete-dialog.component.scss',
})
export class FinancialTransactionDeleteDialogComponent {
  private readonly data = inject<FinancialTransactionDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly financialTransactionsService = inject(FinancialTransactionsService);
  private readonly dialogRef = inject(MatDialogRef<FinancialTransactionDeleteDialogComponent, boolean>);

  readonly transaction = this.data.transaction;
  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');

  confirmDelete(): void {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.errorMessage.set('');

    this.financialTransactionsService
      .remove(this.transaction.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: () => {
          this.errorMessage.set('No fue posible eliminar la transaccion financiera.');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  formatAmount(amount: string, currency: string): string {
    const parsedAmount = Number(amount);

    if (Number.isNaN(parsedAmount)) {
      return `${amount} ${currency}`.trim();
    }

    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsedAmount);
  }
}
