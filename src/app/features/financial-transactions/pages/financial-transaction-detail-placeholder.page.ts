import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { FinancialTransactionDeleteDialogComponent } from '../components/financial-transaction-delete-dialog.component';
import { FinancialTransactionDetailContentComponent } from '../components/financial-transaction-detail-content.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { FinancialTransactionResponse } from '../models/financial-transaction.models';
import { FinancialTransactionsService } from '../services/financial-transactions.service';

@Component({
  selector: 'app-financial-transaction-detail-placeholder-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FinancialTransactionDetailContentComponent,
    PageHeaderComponent,
    SectionCardComponent,
  ],
  templateUrl: './financial-transaction-detail-placeholder.page.html',
  styleUrl: './financial-transaction-detail-placeholder.page.scss',
})
export class FinancialTransactionDetailPlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly financialTransactionsService = inject(FinancialTransactionsService);

  readonly transactionId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly transaction = signal<FinancialTransactionResponse | null>(null);

  constructor() {
    this.loadTransaction();
  }

  retryLoad(): void {
    this.loadTransaction();
  }

  openDeleteDialog(): void {
    const transaction = this.transaction();

    if (!transaction) {
      return;
    }

    const dialogRef = this.dialog.open(FinancialTransactionDeleteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: this.isLoading(),
      data: {
        transaction,
      },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        void this.router.navigate(['/financial-transactions']);
      }
    });
  }

  private loadTransaction(): void {
    if (!this.transactionId) {
      this.transaction.set(null);
      this.isLoading.set(false);
      this.errorMessage.set('No se encontro el identificador de la transaccion.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.financialTransactionsService
      .findOne(this.transactionId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (transaction) => {
          this.transaction.set(transaction);
        },
        error: () => {
          this.transaction.set(null);
          this.errorMessage.set('No fue posible cargar la transaccion financiera.');
        },
      });
  }
}
