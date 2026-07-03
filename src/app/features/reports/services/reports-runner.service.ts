import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  FinancialTransactionCategory,
  FinancialTransactionResponse,
  FinancialTransactionStatus,
  FinancialTransactionSummaryDto,
  FinancialTransactionType,
  PaymentMethod,
} from '../../financial-transactions/models/financial-transaction.models';
import { FinancialTransactionsService } from '../../financial-transactions/services/financial-transactions.service';
import { ReportDefinition, ReportKey } from '../models/report-definition.model';
import { FinancialReportFilters } from '../models/report-filters.model';
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
      metrics: [
        {
          icon: 'trending_up',
          label: 'Ingresos del periodo',
          value: this.formatCurrency(summary.incomeTotal),
          supportingText: 'Monto acumulado de ingresos dentro del filtro activo.',
          variant: 'green',
        },
        {
          icon: 'trending_down',
          label: 'Egresos del periodo',
          value: this.formatCurrency(summary.expenseTotal),
          supportingText: 'Monto acumulado de egresos para el mismo rango.',
          variant: 'amber',
        },
        {
          icon: 'account_balance_wallet',
          label: 'Balance neto',
          value: this.formatCurrency(summary.netTotal),
          supportingText: 'Diferencia entre ingresos y egresos del reporte.',
          variant: 'blue',
        },
        {
          icon: 'receipt_long',
          label: 'Movimientos encontrados',
          value: this.formatCount(summary.transactionCount),
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
          type: this.getTypeLabel(transaction.type),
          category: this.getCategoryLabel(transaction.category),
          status: this.getStatusLabel(transaction.status),
          amount: this.formatAmount(transaction.amount, transaction.currency),
          currency: transaction.currency,
          paymentMethod: this.getPaymentMethodLabel(transaction.paymentMethod),
          occurredAt: this.formatDate(transaction.occurredAt),
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

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatCount(value: number): string {
    return `${value} ${value === 1 ? 'movimiento' : 'movimientos'}`;
  }

  private formatAmount(amount: string, currency: string): string {
    const parsedAmount = Number(amount);

    if (Number.isNaN(parsedAmount)) {
      return `${amount} ${currency}`.trim();
    }

    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsedAmount);
  }

  private formatDate(value: string): string {
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

  private getTypeLabel(type: FinancialTransactionType): string {
    const labels: Record<FinancialTransactionType, string> = {
      INCOME: 'Ingreso',
      EXPENSE: 'Egreso',
      ADJUSTMENT: 'Ajuste',
      REFUND: 'Reembolso',
    };

    return labels[type];
  }

  private getStatusLabel(status: FinancialTransactionStatus): string {
    const labels: Record<FinancialTransactionStatus, string> = {
      PENDING: 'Pendiente',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    };

    return labels[status];
  }

  private getCategoryLabel(category: FinancialTransactionCategory): string {
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

  private getPaymentMethodLabel(paymentMethod: PaymentMethod | null): string {
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
}
