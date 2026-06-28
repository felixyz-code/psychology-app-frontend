import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { FinancialTransactionFormComponent } from '../components/financial-transaction-form.component';
import { CreateFinancialTransactionDto } from '../models/financial-transaction.models';
import { FinancialTransactionsService } from '../services/financial-transactions.service';

@Component({
  selector: 'app-financial-transaction-form-placeholder-page',
  standalone: true,
  imports: [FinancialTransactionFormComponent],
  templateUrl: './financial-transaction-form-placeholder.page.html',
})
export class FinancialTransactionFormPlaceholderPage {
  private readonly financialTransactionsService = inject(FinancialTransactionsService);
  private readonly router = inject(Router);

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  submit(payload: CreateFinancialTransactionDto): void {
    this.isSaving.set(true);
    this.errorMessage.set('');

    this.financialTransactionsService
      .create(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/financial-transactions']);
        },
        error: () => {
          this.errorMessage.set('No fue posible crear la transaccion financiera.');
        },
      });
  }

  cancel(): void {
    void this.router.navigate(['/financial-transactions']);
  }
}
