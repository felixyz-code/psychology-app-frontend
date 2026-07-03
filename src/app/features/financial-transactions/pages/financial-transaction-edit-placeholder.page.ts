import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { FinancialTransactionFormComponent } from '../components/financial-transaction-form.component';
import { FinancialTransactionResponse, UpdateFinancialTransactionDto } from '../models/financial-transaction.models';
import { FinancialTransactionsService } from '../services/financial-transactions.service';

@Component({
  selector: 'app-financial-transaction-edit-placeholder-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule, FinancialTransactionFormComponent],
  templateUrl: './financial-transaction-edit-placeholder.page.html',
  styleUrl: './financial-transaction-edit-placeholder.page.scss',
})
export class FinancialTransactionEditPlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly financialTransactionsService = inject(FinancialTransactionsService);

  readonly transactionId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadErrorMessage = signal('');
  readonly saveErrorMessage = signal('');
  readonly transaction = signal<FinancialTransactionResponse | null>(null);

  constructor() {
    this.loadTransaction();
  }

  submit(payload: UpdateFinancialTransactionDto): void {
    if (!this.transactionId || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.saveErrorMessage.set('');

    this.financialTransactionsService
      .update(this.transactionId, payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/financial-transactions']);
        },
        error: () => {
          this.saveErrorMessage.set('No fue posible guardar los cambios de la transaccion financiera.');
        },
      });
  }

  cancel(): void {
    void this.router.navigate(['/financial-transactions']);
  }

  retryLoad(): void {
    this.loadTransaction();
  }

  private loadTransaction(): void {
    if (!this.transactionId) {
      this.transaction.set(null);
      this.isLoading.set(false);
      this.loadErrorMessage.set('No se encontro el identificador de la transaccion.');
      return;
    }

    this.isLoading.set(true);
    this.loadErrorMessage.set('');
    this.saveErrorMessage.set('');

    this.financialTransactionsService
      .findOne(this.transactionId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (transaction) => {
          this.transaction.set(transaction);
        },
        error: () => {
          this.transaction.set(null);
          this.loadErrorMessage.set('No fue posible cargar la transaccion financiera.');
        },
      });
  }
}
