import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { FilterToolbarComponent } from '../../../shared/components/filter-toolbar/filter-toolbar.component';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  FinancialTransactionCategory,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMethod,
} from '../../financial-transactions/models/financial-transaction.models';
import {
  buildCurrentMonthDateRange,
  FINANCIAL_TRANSACTION_CATEGORIES,
  FINANCIAL_TRANSACTION_STATUSES,
  FINANCIAL_TRANSACTION_TYPES,
  getFinancialTransactionCategoryLabel,
  getFinancialTransactionStatusLabel,
  getFinancialTransactionTypeLabel,
  getPaymentMethodLabel,
  PAYMENT_METHODS,
} from '../../financial-transactions/utils/financial-transaction-presenters';
import { ReportExportMenuComponent } from '../components/report-export-menu.component';
import { ReportFiltersPanelComponent } from '../components/report-filters-panel.component';
import { ReportPreviewShellComponent } from '../components/report-preview-shell.component';
import { ReportDefinition, ReportExportFormat, ReportKey } from '../models/report-definition.model';
import { FinancialReportFilters } from '../models/report-filters.model';
import { ReportResult } from '../models/report-result.model';
import { ReportsCatalogService } from '../services/reports-catalog.service';
import { ReportsExportService } from '../services/reports-export.service';
import { ReportsRunnerService } from '../services/reports-runner.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-report-runner-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    FilterToolbarComponent,
    MetricCardComponent,
    PageHeaderComponent,
    ReportExportMenuComponent,
    ReportFiltersPanelComponent,
    ReportPreviewShellComponent,
  ],
  templateUrl: './report-runner.page.html',
  styleUrl: './report-runner.page.scss',
})
export class ReportRunnerPage {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly reportsCatalogService = inject(ReportsCatalogService);
  private readonly reportsExportService = inject(ReportsExportService);
  private readonly reportsRunnerService = inject(ReportsRunnerService);
  private readonly reportKey = this.activatedRoute.snapshot.data['reportKey'] as ReportKey;
  private readonly defaultDateRange = buildCurrentMonthDateRange();
  private reportLoadSubscription?: Subscription;

  readonly transactionTypes: FinancialTransactionType[] = FINANCIAL_TRANSACTION_TYPES;
  readonly transactionStatuses: FinancialTransactionStatus[] = FINANCIAL_TRANSACTION_STATUSES;
  readonly transactionCategories: FinancialTransactionCategory[] = FINANCIAL_TRANSACTION_CATEGORIES;
  readonly paymentMethods: PaymentMethod[] = PAYMENT_METHODS;
  readonly definition = signal<ReportDefinition | null>(this.reportsCatalogService.getReportByKey(this.reportKey) ?? null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly reportResult = signal<ReportResult<FinancialReportFilters> | null>(null);
  readonly appliedFilters = signal<FinancialReportFilters>(this.defaultDateRange);
  readonly filtersForm = this.formBuilder.group({
    type: '',
    status: '',
    category: '',
    paymentMethod: '',
    from: this.defaultDateRange.from ?? '',
    to: this.defaultDateRange.to ?? '',
  });
  readonly metrics = computed(() => this.reportResult()?.metrics ?? []);
  readonly displayedColumns = computed(() => this.reportResult()?.columns.map((column) => column.key) ?? []);
  readonly resultsLabel = computed(() => {
    const rowsCount = this.reportResult()?.rows.length ?? 0;
    return rowsCount === 1 ? '1 movimiento en la vista previa' : `${rowsCount} movimientos en la vista previa`;
  });

  constructor() {
    this.loadReport();
  }

  applyFilters(): void {
    const filters = this.buildFiltersQuery();
    this.appliedFilters.set(filters);
    this.loadReport(filters);
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
    this.loadReport({});
  }

  retry(): void {
    this.loadReport();
  }

  export(format: ReportExportFormat): void {
    const result = this.reportResult();

    if (!result) {
      return;
    }

    if (format === 'pdf') {
      this.reportsExportService.exportAsPdf(result);
      return;
    }

    this.reportsExportService.exportAsCsv(result);
  }

  hasActiveFilters(): boolean {
    return Object.keys(this.appliedFilters()).length > 0;
  }

  getTypeLabel(type: FinancialTransactionType): string {
    return getFinancialTransactionTypeLabel(type);
  }

  getStatusLabel(status: FinancialTransactionStatus): string {
    return getFinancialTransactionStatusLabel(status);
  }

  getCategoryLabel(category: FinancialTransactionCategory): string {
    return getFinancialTransactionCategoryLabel(category);
  }

  getPaymentMethodLabel(paymentMethod: PaymentMethod): string {
    return getPaymentMethodLabel(paymentMethod);
  }

  private loadReport(filters: FinancialReportFilters = this.appliedFilters()): void {
    this.reportLoadSubscription?.unsubscribe();
    this.isLoading.set(true);
    this.errorMessage.set('');

    if (this.reportKey !== 'financial') {
      this.reportResult.set(null);
      this.errorMessage.set('El reporte solicitado no esta disponible.');
      this.isLoading.set(false);
      return;
    }

    this.reportLoadSubscription = this.reportsRunnerService.runFinancialReport(filters).subscribe({
      next: (result) => {
        this.reportResult.set(result);
        this.isLoading.set(false);
      },
      error: () => {
        this.reportResult.set(null);
        this.errorMessage.set('No fue posible generar el reporte financiero.');
        this.isLoading.set(false);
      },
    });
  }

  private buildFiltersQuery(): FinancialReportFilters {
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
