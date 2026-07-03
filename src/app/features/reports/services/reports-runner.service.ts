import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  FinancialTransactionResponse,
  FinancialTransactionSummaryDto,
} from '../../financial-transactions/models/financial-transaction.models';
import { FinancialTransactionsService } from '../../financial-transactions/services/financial-transactions.service';
import {
  formatFinancialAmount,
  formatFinancialCount,
  formatFinancialDate,
  formatFinancialCurrency,
  getFinancialTransactionCategoryLabel,
  getFinancialTransactionStatusLabel,
  getFinancialTransactionTypeLabel,
  getPaymentMethodLabel,
} from '../../financial-transactions/utils/financial-transaction-presenters';
import { ReportDefinition, ReportKey } from '../models/report-definition.model';
import { FinancialReportFilters } from '../models/report-filters.model';
import { ReportContextItem } from '../models/report-result.model';
import { ReportResult } from '../models/report-result.model';
import { ReportsCatalogService } from './reports-catalog.service';

@Injectable({ providedIn: 'root' })
export class ReportsRunnerService {
  private readonly financialTransactionsService = inject(FinancialTransactionsService);
  private readonly reportsCatalogService = inject(ReportsCatalogService);

  runFinancialReport(filters: FinancialReportFilters): Observable<ReportResult<FinancialReportFilters>> {
    const definition = this.getDefinition('financial');

    return forkJoin({
      summary: this.financialTransactionsService.findSummary(filters),
      transactions: this.financialTransactionsService.findAll(filters),
    }).pipe(
      map(({ summary, transactions }) => this.buildFinancialResult(definition, filters, summary, transactions))
    );
  }

  private buildFinancialResult(
    definition: ReportDefinition,
    filters: FinancialReportFilters,
    summary: FinancialTransactionSummaryDto,
    transactions: FinancialTransactionResponse[]
  ): ReportResult<FinancialReportFilters> {
    return {
      reportKey: definition.key,
      title: definition.title,
      generatedAt: new Date().toISOString(),
      appliedFilters: filters,
      contextItems: this.buildFinancialContextItems(filters),
      metrics: [
        {
          icon: 'trending_up',
          label: 'Ingresos del periodo',
          value: formatFinancialCurrency(summary.incomeTotal),
          supportingText: 'Monto acumulado de ingresos dentro del filtro activo.',
          variant: 'green',
        },
        {
          icon: 'trending_down',
          label: 'Egresos del periodo',
          value: formatFinancialCurrency(summary.expenseTotal),
          supportingText: 'Monto acumulado de egresos para el mismo rango.',
          variant: 'amber',
        },
        {
          icon: 'account_balance_wallet',
          label: 'Balance neto',
          value: formatFinancialCurrency(summary.netTotal),
          supportingText: 'Diferencia entre ingresos y egresos del reporte.',
          variant: 'blue',
        },
        {
          icon: 'receipt_long',
          label: 'Movimientos encontrados',
          value: this.formatMetricCount(summary.transactionCount),
          supportingText: 'Cantidad total de transacciones incluidas en la vista previa.',
          variant: 'violet',
        },
      ],
      columns: [
        { key: 'concept', label: 'Concepto' },
        { key: 'type', label: 'Tipo' },
        { key: 'category', label: 'Categoria' },
        { key: 'status', label: 'Estado' },
        { key: 'amount', label: 'Monto', align: 'end' },
        { key: 'currency', label: 'Moneda' },
        { key: 'paymentMethod', label: 'Metodo de pago' },
        { key: 'occurredAt', label: 'Fecha' },
      ],
      rows: transactions.map((transaction) => ({
        id: transaction.id,
        values: {
          concept: transaction.concept,
          type: getFinancialTransactionTypeLabel(transaction.type),
          category: getFinancialTransactionCategoryLabel(transaction.category),
          status: getFinancialTransactionStatusLabel(transaction.status),
          amount: formatFinancialAmount(transaction.amount, transaction.currency),
          currency: transaction.currency,
          paymentMethod: getPaymentMethodLabel(transaction.paymentMethod),
          occurredAt: formatFinancialDate(transaction.occurredAt),
        },
      })),
      csvFileName: this.buildCsvFileName(filters),
      supportedExports: definition.supportedExports,
      emptyTitle: 'No hay movimientos para este reporte',
      emptyMessage:
        'Ajusta los filtros o amplia el rango de fechas para visualizar movimientos financieros en el reporte.',
    };
  }

  private getDefinition(key: ReportKey): ReportDefinition {
    const definition = this.reportsCatalogService.getReportByKey(key);

    if (!definition) {
      throw new Error(`Report definition not found for key: ${key}`);
    }

    return definition;
  }

  private buildCsvFileName(filters: FinancialReportFilters): string {
    const from = filters.from ?? 'sin-desde';
    const to = filters.to ?? 'sin-hasta';

    return `reporte-financiero-${from}-${to}.csv`;
  }

  private buildFinancialContextItems(filters: FinancialReportFilters): ReportContextItem[] {
    return [
      {
        label: 'Periodo',
        value: this.buildDateRangeLabel(filters),
      },
      {
        label: 'Tipo',
        value: filters.type ? getFinancialTransactionTypeLabel(filters.type) : 'Todos los tipos',
      },
      {
        label: 'Estado',
        value: filters.status ? getFinancialTransactionStatusLabel(filters.status) : 'Todos los estados',
      },
      {
        label: 'Categoria',
        value: filters.category ? getFinancialTransactionCategoryLabel(filters.category) : 'Todas las categorias',
      },
      {
        label: 'Metodo de pago',
        value: filters.paymentMethod ? getPaymentMethodLabel(filters.paymentMethod) : 'Todos los metodos',
      },
    ];
  }

  private buildDateRangeLabel(filters: FinancialReportFilters): string {
    const from = filters.from ? formatFinancialDate(filters.from) : null;
    const to = filters.to ? formatFinancialDate(filters.to) : null;

    if (from && to) {
      return `${from} al ${to}`;
    }

    if (from) {
      return `Desde ${from}`;
    }

    if (to) {
      return `Hasta ${to}`;
    }

    return 'Historico completo';
  }

  private formatMetricCount(value: number): string {
    const count = formatFinancialCount(value);
    return `${count} ${value === 1 ? 'movimiento' : 'movimientos'}`;
  }
}
