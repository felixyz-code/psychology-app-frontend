import {
  FinancialTransactionCategory,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMethod,
} from '../../financial-transactions/models/financial-transaction.models';

export interface ReportDateRangeFilters {
  from?: string;
  to?: string;
}

export interface FinancialReportFilters extends ReportDateRangeFilters {
  type?: FinancialTransactionType;
  status?: FinancialTransactionStatus;
  category?: FinancialTransactionCategory;
  paymentMethod?: PaymentMethod;
}
