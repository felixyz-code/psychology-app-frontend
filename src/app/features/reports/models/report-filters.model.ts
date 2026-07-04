import {
  FinancialTransactionCategory,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMethod,
} from '../../financial-transactions/models/financial-transaction.models';
import { AppointmentStatus } from '../../appointments/models/appointment.models';
import { ClinicalRecordReportFilters } from './clinical-record-report.model';
import { ClinicalSummaryReportFilters } from './clinical-summary-report.model';

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

export interface AgendaReportFilters extends ReportDateRangeFilters {
  status?: AppointmentStatus;
  patientId?: string;
}

export type ReportFilters =
  | FinancialReportFilters
  | AgendaReportFilters
  | ClinicalSummaryReportFilters
  | ClinicalRecordReportFilters;
