export type FinancialTransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'ADJUSTMENT'
  | 'REFUND';

export type FinancialTransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export type FinancialTransactionCategory =
  | 'SESSION'
  | 'ASSESSMENT'
  | 'MANUAL'
  | 'RENT'
  | 'UTILITIES'
  | 'SUPPLIES'
  | 'SOFTWARE'
  | 'SALARY'
  | 'OTHER';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'TRANSFER'
  | 'CHECK'
  | 'OTHER';

export interface CreateFinancialTransactionDto {
  type: FinancialTransactionType;
  status?: FinancialTransactionStatus;
  category?: FinancialTransactionCategory;
  amount: number;
  currency?: string;
  concept: string;
  description?: string;
  occurredAt: string;
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  patientId?: string;
  appointmentId?: string;
  createdById?: string;
}

export type UpdateFinancialTransactionDto = Partial<CreateFinancialTransactionDto>;

export interface FindFinancialTransactionsQueryDto {
  from?: string;
  to?: string;
  type?: FinancialTransactionType;
  status?: FinancialTransactionStatus;
  category?: FinancialTransactionCategory;
  paymentMethod?: PaymentMethod;
  patientId?: string;
  appointmentId?: string;
  createdById?: string;
}

export interface FinancialTransactionResponse {
  id: string;
  type: FinancialTransactionType;
  status: FinancialTransactionStatus;
  category: FinancialTransactionCategory;
  amount: string;
  currency: string;
  concept: string;
  description: string | null;
  occurredAt: string;
  dueDate: string | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  patientId: string | null;
  appointmentId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransactionSummaryDto {
  incomeTotal: number;
  expenseTotal: number;
  adjustmentTotal: number;
  refundTotal: number;
  netTotal: number;
  transactionCount: number;
}
