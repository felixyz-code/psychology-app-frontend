import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { DataTableEmptyStateComponent } from '../../../shared/components/data-table-empty-state/data-table-empty-state.component';
import { FilterToolbarComponent } from '../../../shared/components/filter-toolbar/filter-toolbar.component';
import { MetricCardComponent, MetricCardVariant } from '../../../shared/components/metric-card/metric-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SectionCardComponent } from '../../../shared/components/section-card/section-card.component';
import { StatusBadgeComponent, StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { FinancialTransactionDeleteDialogComponent } from '../components/financial-transaction-delete-dialog.component';
import { FinancialTransactionDetailDialogComponent } from '../components/financial-transaction-detail-dialog.component';
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
import {
  buildCurrentMonthDateRange,
  FINANCIAL_TRANSACTION_CATEGORIES,
  FINANCIAL_TRANSACTION_STATUSES,
  FINANCIAL_TRANSACTION_TYPES,
  formatFinancialAmount,
  formatFinancialCount,
  formatFinancialCurrency,
  formatFinancialDate,
  getFinancialTransactionCategoryLabel,
  getFinancialTransactionStatusLabel,
  getFinancialTransactionStatusVariant,
  getFinancialTransactionTypeLabel,
  getFinancialTransactionTypeVariant,
  getPaymentMethodLabel,
  PAYMENT_METHODS,
} from '../utils/financial-transaction-presenters';

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
    MatTooltipModule,
    DataTableEmptyStateComponent,
    FilterToolbarComponent,
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
  private readonly defaultDateRange = buildCurrentMonthDateRange();
  private transactionsLoadSubscription?: Subscription;
  private summaryLoadSubscription?: Subscription;

  readonly displayedColumns = ['concept', 'type', 'category', 'amount', 'currency', 'status', 'occurredAt', 'paymentMethod', 'actions'];
  readonly transactionTypes: FinancialTransactionType[] = FINANCIAL_TRANSACTION_TYPES;
  readonly transactionStatuses: FinancialTransactionStatus[] = FINANCIAL_TRANSACTION_STATUSES;
  readonly transactionCategories: FinancialTransactionCategory[] = FINANCIAL_TRANSACTION_CATEGORIES;
  readonly paymentMethods: PaymentMethod[] = PAYMENT_METHODS;
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
        value: formatFinancialCurrency(summary?.incomeTotal),
        supportingText: 'Ingresos registrados desde el primer dia del mes hasta hoy.',
        tone: 'green' as MetricCardVariant,
      },
      {
        icon: 'trending_down',
        label: 'Egresos del mes',
        value: formatFinancialCurrency(summary?.expenseTotal),
        supportingText: 'Egresos registrados dentro del rango mensual activo.',
        tone: 'amber' as MetricCardVariant,
      },
      {
        icon: 'account_balance_wallet',
        label: 'Balance del mes',
        value: formatFinancialCurrency(summary?.netTotal),
        supportingText: 'Diferencia neta entre ingresos y egresos del mes en curso.',
        tone: 'blue' as MetricCardVariant,
      },
      {
        icon: 'receipt_long',
        label: 'Movimientos del mes',
        value: formatFinancialCount(summary?.transactionCount),
        supportingText: 'Cantidad de transacciones encontradas para el rango mensual activo.',
        tone: 'violet' as MetricCardVariant,
      },
    ];
  });

  constructor() {
    this.reloadData();
  }

  loadTransactions(query: FindFinancialTransactionsQueryDto = this.appliedFilters()): void {
    this.transactionsLoadSubscription?.unsubscribe();
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.transactionsLoadSubscription = this.financialTransactionsService.findAll(query).subscribe({
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
    this.summaryLoadSubscription?.unsubscribe();
    this.isSummaryLoading.set(true);
    this.summaryErrorMessage.set('');

    this.summaryLoadSubscription = this.financialTransactionsService.findSummary(query).subscribe({
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

  openDetailDialog(transaction: FinancialTransactionResponse): void {
    this.dialog.open(FinancialTransactionDetailDialogComponent, {
      width: '960px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        transaction,
      },
    });
  }

  stopRowClick(event: Event): void {
    event.stopPropagation();
  }

  hasActiveFilters(): boolean {
    return Object.keys(this.appliedFilters()).length > 0;
  }

  getTypeLabel(type: FinancialTransactionType): string {
    return getFinancialTransactionTypeLabel(type);
  }

  getTypeVariant(type: FinancialTransactionType): StatusBadgeVariant {
    return getFinancialTransactionTypeVariant(type);
  }

  getCategoryLabel(category: FinancialTransactionCategory): string {
    return getFinancialTransactionCategoryLabel(category);
  }

  getStatusLabel(status: FinancialTransactionStatus): string {
    return getFinancialTransactionStatusLabel(status);
  }

  getStatusVariant(status: FinancialTransactionStatus): StatusBadgeVariant {
    return getFinancialTransactionStatusVariant(status);
  }

  getPaymentMethodLabel(paymentMethod: PaymentMethod | null): string {
    return getPaymentMethodLabel(paymentMethod);
  }

  formatAmount(amount: string, currency: string): string {
    return formatFinancialAmount(amount, currency);
  }

  retrySummary(): void {
    this.loadSummary();
  }

  formatDate(value: string): string {
    return formatFinancialDate(value);
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
}
