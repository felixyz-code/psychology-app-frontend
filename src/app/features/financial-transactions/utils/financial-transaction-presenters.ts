import { StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import {
  FinancialTransactionCategory,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMethod,
} from '../models/financial-transaction.models';

export const FINANCIAL_TRANSACTION_TYPES: FinancialTransactionType[] = ['INCOME', 'EXPENSE', 'ADJUSTMENT', 'REFUND'];

export const FINANCIAL_TRANSACTION_STATUSES: FinancialTransactionStatus[] = ['PENDING', 'COMPLETED', 'CANCELLED'];

export const FINANCIAL_TRANSACTION_CATEGORIES: FinancialTransactionCategory[] = [
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

export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'CHECK', 'OTHER'];

export function getFinancialTransactionTypeLabel(type: FinancialTransactionType): string {
  const labels: Record<FinancialTransactionType, string> = {
    INCOME: 'Ingreso',
    EXPENSE: 'Egreso',
    ADJUSTMENT: 'Ajuste',
    REFUND: 'Reembolso',
  };

  return labels[type];
}

export function getFinancialTransactionTypeVariant(type: FinancialTransactionType): StatusBadgeVariant {
  const variants: Record<FinancialTransactionType, StatusBadgeVariant> = {
    INCOME: 'success',
    EXPENSE: 'danger',
    ADJUSTMENT: 'warning',
    REFUND: 'primary',
  };

  return variants[type];
}

export function getFinancialTransactionStatusLabel(status: FinancialTransactionStatus): string {
  const labels: Record<FinancialTransactionStatus, string> = {
    PENDING: 'Pendiente',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
  };

  return labels[status];
}

export function getFinancialTransactionStatusVariant(status: FinancialTransactionStatus): StatusBadgeVariant {
  const variants: Record<FinancialTransactionStatus, StatusBadgeVariant> = {
    PENDING: 'warning',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };

  return variants[status];
}

export function getFinancialTransactionCategoryLabel(category: FinancialTransactionCategory): string {
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

export function getPaymentMethodLabel(paymentMethod: PaymentMethod | null): string {
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

export function formatFinancialAmount(amount: string, currency: string): string {
  const parsedAmount = Number(amount);

  if (Number.isNaN(parsedAmount)) {
    return `${amount} ${currency}`.trim();
  }

  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsedAmount);
}

export function formatFinancialCurrency(value: number | undefined, currency = 'MXN'): string {
  if (value === undefined) {
    return '--';
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatFinancialCount(value: number | undefined): string {
  if (value === undefined) {
    return '--';
  }

  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatFinancialDate(value: string): string {
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

export function formatFinancialDateTime(value: string): string {
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

export function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function buildCurrentMonthDateRange(): { from: string; to: string } {
  const now = new Date();

  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInputValue(now),
  };
}
