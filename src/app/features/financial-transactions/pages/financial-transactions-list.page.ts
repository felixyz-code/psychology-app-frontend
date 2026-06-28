import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import {
  FinancialTransactionCategory,
  FindFinancialTransactionsQueryDto,
  FinancialTransactionResponse,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMethod,
} from '../models/financial-transaction.models';
import { FinancialTransactionsService } from '../services/financial-transactions.service';

@Component({
  selector: 'app-financial-transactions-list-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    DataTableEmptyStateComponent,
    PageHeaderComponent,
    SectionCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './financial-transactions-list.page.html',
  styleUrl: './financial-transactions-list.page.scss',
})
export class FinancialTransactionsListPage {
  private readonly financialTransactionsService = inject(FinancialTransactionsService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly displayedColumns = ['concept', 'type', 'category', 'amount', 'currency', 'status', 'occurredAt', 'paymentMethod', 'actions'];
  readonly transactionTypes: FinancialTransactionType[] = ['INCOME', 'EXPENSE', 'ADJUSTMENT', 'REFUND'];
  readonly transactionStatuses: FinancialTransactionStatus[] = ['PENDING', 'COMPLETED', 'CANCELLED'];
  readonly transactionCategories: FinancialTransactionCategory[] = [
    'SESSION',
    'ASSESSMENT',
    'MANUAL',
    'RENT',
    'UTILITIES',
    'SUPPLIES',
    'SOFTWARE',
    'SALARY',
    'OTHER',
  ];
  readonly paymentMethods: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'CHECK', 'OTHER'];
  readonly transactions = signal<FinancialTransactionResponse[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly appliedFilters = signal<FindFinancialTransactionsQueryDto>({});
  readonly filtersForm = this.formBuilder.group({
    type: '',
    status: '',
    category: '',
    paymentMethod: '',
    from: '',
    to: '',
  });

  constructor() {
    this.loadTransactions();
  }

  loadTransactions(query: FindFinancialTransactionsQueryDto = this.appliedFilters()): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.financialTransactionsService.findAll(query).subscribe({
      next: (transactions) => {
        this.transactions.set(transactions);
        this.isLoading.set(false);
      },
      error: () => {
        this.transactions.set([]);
        this.errorMessage.set('No fue posible cargar las transacciones financieras.');
        this.isLoading.set(false);
      },
    });
  }

  applyFilters(): void {
    const filters = this.buildFiltersQuery();
    this.appliedFilters.set(filters);
    this.loadTransactions(filters);
  }

  clearFilters(): void {
    this.filtersForm.reset({
      type: '',
      status: '',
      category: '',
      paymentMethod: '',
      from: '',
      to: '',
    });
    this.appliedFilters.set({});
    this.loadTransactions({});
  }

  hasActiveFilters(): boolean {
    return Object.keys(this.appliedFilters()).length > 0;
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

  getPaymentMethodLabel(paymentMethod: PaymentMethod | null): string {
    if (!paymentMethod) {
      return '-';
    }

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

  formatDate(value: string): string {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return '-';
    }

    return parsedDate.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private buildFiltersQuery(): FindFinancialTransactionsQueryDto {
    const rawValue = this.filtersForm.getRawValue();

    return {
      type: (rawValue.type || undefined) as FinancialTransactionType | undefined,
      status: (rawValue.status || undefined) as FinancialTransactionStatus | undefined,
      category: (rawValue.category || undefined) as FinancialTransactionCategory | undefined,
      paymentMethod: (rawValue.paymentMethod || undefined) as PaymentMethod | undefined,
      from: rawValue.from || undefined,
      to: rawValue.to || undefined,
    };
  }
}
