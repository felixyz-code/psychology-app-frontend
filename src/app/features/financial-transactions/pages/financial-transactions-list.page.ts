import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { MetricCardComponent, MetricCardVariant } from '../../../shared/components/metric-card/metric-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { FinancialTransactionDeleteDialogComponent } from '../components/financial-transaction-delete-dialog.component';
import {
  FinancialTransactionCategory,
  FindFinancialTransactionsQueryDto,
  FinancialTransactionResponse,
  FinancialTransactionStatus,
  FinancialTransactionSummaryDto,
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
    MetricCardComponent,
    PageHeaderComponent,
    SectionCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './financial-transactions-list.page.html',
  styleUrl: './financial-transactions-list.page.scss',
})
export class FinancialTransactionsListPage {
  private readonly dialog = inject(MatDialog);
  private readonly financialTransactionsService = inject(FinancialTransactionsService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly defaultDateRange = this.buildCurrentMonthRange();

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
  readonly summary = signal<FinancialTransactionSummaryDto | null>(null);
  readonly isLoading = signal(true);
  readonly isSummaryLoading = signal(true);
  readonly errorMessage = signal('');
  readonly summaryErrorMessage = signal('');
  readonly appliedFilters = signal<FindFinancialTransactionsQueryDto>(this.defaultDateRange);
  readonly filtersForm = this.formBuilder.group({
    type: '',
    status: '',
    category: '',
    paymentMethod: '',
    from: this.defaultDateRange.from ?? '',
    to: this.defaultDateRange.to ?? '',
  });
  readonly summaryCards = computed(() => {
    const summary = this.summary();

    return [
      {
        icon: 'trending_up',
        label: 'Ingresos del mes',
        value: this.formatCurrency(summary?.incomeTotal),
        supportingText: 'Ingresos registrados desde el primer dia del mes hasta hoy.',
        tone: 'green' as MetricCardVariant,
      },
      {
        icon: 'trending_down',
        label: 'Egresos del mes',
        value: this.formatCurrency(summary?.expenseTotal),
        supportingText: 'Egresos registrados dentro del rango mensual activo.',
        tone: 'amber' as MetricCardVariant,
      },
      {
        icon: 'account_balance_wallet',
        label: 'Balance del mes',
        value: this.formatCurrency(summary?.netTotal),
        supportingText: 'Diferencia neta entre ingresos y egresos del mes en curso.',
        tone: 'blue' as MetricCardVariant,
      },
      {
        icon: 'receipt_long',
        label: 'Movimientos del mes',
        value: this.formatCount(summary?.transactionCount),
        supportingText: 'Cantidad de transacciones encontradas para el rango mensual activo.',
        tone: 'violet' as MetricCardVariant,
      },
    ];
  });

  constructor() {
    this.reloadData();
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

  loadSummary(query: FindFinancialTransactionsQueryDto = this.appliedFilters()): void {
    this.isSummaryLoading.set(true);
    this.summaryErrorMessage.set('');

    this.financialTransactionsService.findSummary(query).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.isSummaryLoading.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.summaryErrorMessage.set('No fue posible cargar el resumen financiero.');
        this.isSummaryLoading.set(false);
      },
    });
  }

  applyFilters(): void {
    const filters = this.buildFiltersQuery();
    this.appliedFilters.set(filters);
    this.reloadData(filters);
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
    this.reloadData({});
  }

  openDeleteDialog(transaction: FinancialTransactionResponse): void {
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
        this.reloadData();
      }
    });
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

  retrySummary(): void {
    this.loadSummary();
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

  private reloadData(query: FindFinancialTransactionsQueryDto = this.appliedFilters()): void {
    this.loadSummary(query);
    this.loadTransactions(query);
  }

  private formatCurrency(amount: number | undefined): string {
    if (amount === undefined) {
      return '--';
    }

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private formatCount(value: number | undefined): string {
    if (value === undefined) {
      return '--';
    }

    return new Intl.NumberFormat('es-MX', {
      maximumFractionDigits: 0,
    }).format(value);
  }

  private buildCurrentMonthRange(): FindFinancialTransactionsQueryDto {
    const now = new Date();

    return {
      from: this.toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: this.toDateInputValue(now),
    };
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
