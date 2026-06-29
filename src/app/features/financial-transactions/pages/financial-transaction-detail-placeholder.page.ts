import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { FinancialTransactionDeleteDialogComponent } from '../components/financial-transaction-delete-dialog.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import {
  FinancialTransactionCategory,
  FinancialTransactionResponse,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMethod,
} from '../models/financial-transaction.models';
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
    PageHeaderComponent,
    SectionCardComponent,
    StatusBadgeComponent,
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

  getTypeLabel(type: FinancialTransactionType): string {
    const labels: Record<FinancialTransactionType, string> = {
      INCOME: 'Ingreso',
      EXPENSE: 'Egreso',
      ADJUSTMENT: 'Ajuste',
      REFUND: 'Reembolso',
    };

    return labels[type];
  }

  getTypeVariant(type: FinancialTransactionType): StatusBadgeVariant {
    const variants: Record<FinancialTransactionType, StatusBadgeVariant> = {
      INCOME: 'success',
      EXPENSE: 'danger',
      ADJUSTMENT: 'warning',
      REFUND: 'primary',
    };

    return variants[type];
  }

  getStatusLabel(status: FinancialTransactionStatus): string {
    const labels: Record<FinancialTransactionStatus, string> = {
      PENDING: 'Pendiente',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    };

    return labels[status];
  }

  getStatusVariant(status: FinancialTransactionStatus): StatusBadgeVariant {
    const variants: Record<FinancialTransactionStatus, StatusBadgeVariant> = {
      PENDING: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };

    return variants[status];
  }

  getCategoryLabel(category: FinancialTransactionCategory): string {
    const labels: Record<FinancialTransactionCategory, string> = {
      SESSION: 'Sesion',
      ASSESSMENT: 'Evaluacion',
      MANUAL: 'Manual',
      RENT: 'Renta',
      UTILITIES: 'Servicios',
      SUPPLIES: 'Insumos',
      SOFTWARE: 'Software',
      SALARY: 'Salario',
      OTHER: 'Otro',
    };

    return labels[category];
  }

  getPaymentMethodLabel(paymentMethod: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      CASH: 'Efectivo',
      CARD: 'Tarjeta',
      TRANSFER: 'Transferencia',
      CHECK: 'Cheque',
      OTHER: 'Otro',
    };

    return labels[paymentMethod];
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

  formatDateTime(value: string): string {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return '-';
    }

    return parsedDate.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
