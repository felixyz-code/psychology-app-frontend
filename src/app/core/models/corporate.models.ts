export type PaefAgreementStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'TERMINATED' | 'EXPIRED';

export type BenefitPoolStatus = 'ACTIVE' | 'DEPLETED' | 'EXPIRED' | 'CANCELLED';

export type EmployeeEligibilityStatus = 'ACTIVE' | 'INACTIVE' | 'REVOKED';

export type BenefitDebitStatus = 'RESERVED' | 'CONFIRMED' | 'RELEASED' | 'REFUNDED';

export type BenefitDebitType = 'SESSION_BOOKING' | 'MANUAL_ADJUSTMENT' | 'SESSION_CANCEL_REFUND';

export interface CorporateClient {
  id: string;
  organizationId: string;
  name: string;
  commercialName?: string | null;
  taxId?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  domainWhitelist: string[];
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    agreements: number;
  };
}

export interface PaefAgreement {
  id: string;
  organizationId: string;
  corporateClientId: string;
  code: string;
  title: string;
  description?: string | null;
  status: PaefAgreementStatus;
  isMultiBranch: boolean;
  allowedBranchIds: string[];
  defaultMaxSessionsPerEmployee: number;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
  corporateClient?: {
    id: string;
    name: string;
    commercialName?: string | null;
    domainWhitelist?: string[];
  };
  benefitPools?: BenefitPool[];
  _count?: {
    employeeEligibilities: number;
    debitLogs: number;
  };
}

export interface BenefitPool {
  id: string;
  organizationId: string;
  agreementId: string;
  name: string;
  totalSessions: number;
  consumedSessions: number;
  reservedSessions: number;
  availableSessions?: number;
  utilizationPercentage?: number;
  status: BenefitPoolStatus;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeEligibility {
  id: string;
  organizationId: string;
  agreementId: string;
  email: string;
  employeeNumber?: string | null;
  nationalId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  maxSessionsAllowed: number;
  consumedSessions: number;
  reservedSessions: number;
  availableSessions?: number;
  status: EmployeeEligibilityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BenefitDebitLog {
  id: string;
  organizationId: string;
  agreementId: string;
  poolId: string;
  eligibilityId?: string | null;
  branchId?: string | null;
  appointmentId?: string | null;
  patientId?: string | null;
  userId?: string | null;
  transactionType: BenefitDebitType;
  sessionQuantity: number;
  status: BenefitDebitStatus;
  reason?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  agreement?: { id: string; code: string; title: string };
  pool?: { id: string; name: string };
  eligibility?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    employeeNumber?: string | null;
  };
  branch?: { id: string; name: string; code: string };
}

export interface EligibilityCheckResult {
  isEligible: boolean;
  reason: string;
  message: string;
  eligibility?: {
    id: string;
    email: string;
    employeeNumber?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    department?: string | null;
    maxSessionsAllowed: number;
    consumedSessions: number;
    reservedSessions: number;
    availableSessions: number;
  };
  agreement?: {
    id: string;
    code: string;
    title: string;
    corporateClient: { id: string; name: string };
  };
  availablePools?: Array<{
    id: string;
    name: string;
    totalSessions: number;
    consumedSessions: number;
    reservedSessions: number;
    availableSessions: number;
  }>;
}

export interface CreateCorporateClientPayload {
  name: string;
  commercialName?: string;
  taxId?: string;
  contactEmail?: string;
  contactPhone?: string;
  domainWhitelist?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface CreatePaefAgreementPayload {
  corporateClientId: string;
  code: string;
  title: string;
  description?: string;
  status?: PaefAgreementStatus;
  isMultiBranch?: boolean;
  allowedBranchIds?: string[];
  defaultMaxSessionsPerEmployee?: number;
  validFrom: string;
  validUntil: string;
}

export interface CreateBenefitPoolPayload {
  name: string;
  totalSessions: number;
  status?: BenefitPoolStatus;
  validFrom: string;
  validUntil: string;
}

export interface CreateEmployeeEligibilityPayload {
  email: string;
  employeeNumber?: string;
  nationalId?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  maxSessionsAllowed?: number;
  status?: EmployeeEligibilityStatus;
}

export interface DepartmentDistributionItem {
  department: string;
  employeeCount: number;
  sessionsConsumed: number;
  percentageOfTotalSessions: number;
  isAggregated: boolean;
}

export interface ExecutiveKpis {
  totalSessionsContracted: number;
  totalSessionsConsumed: number;
  totalSessionsReserved: number;
  totalSessionsAvailable: number;
  burnRatePercentage: number;
  uniqueEmployeesEntitled: number;
  uniqueEmployeesAttended: number;
  coveragePercentage: number;
}

export interface ExecutiveReportResponse {
  agreement: {
    id: string;
    code: string;
    title: string;
    status: string;
    corporateClient: {
      id: string;
      name: string;
      commercialName: string | null;
    };
  };
  kpis: ExecutiveKpis;
  poolBreakdown: Array<{
    poolId: string;
    name: string;
    totalSessions: number;
    consumedSessions: number;
    reservedSessions: number;
    availableSessions: number;
    utilizationPercentage: number;
    status: string;
    validFrom: string;
    validUntil: string;
  }>;
  departmentDistribution: DepartmentDistributionItem[];
  periodSummary: {
    startDate: string | null;
    endDate: string | null;
    branchId: string | null;
    totalConfirmedInPeriod: number;
  };
  privacyNotice: string;
}

export interface BillingStatementResponse {
  statementNumber: string;
  generatedAt: string;
  agreement: {
    id: string;
    code: string;
    title: string;
    corporateClient: {
      id: string;
      name: string;
      taxId: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
    };
  };
  billingPeriod: {
    startDate: string;
    endDate: string;
  };
  unitPrice: number;
  currency: string;
  summary: {
    billableSessionsCount: number;
    subtotal: number;
    ivaTaxRate: number;
    ivaAmount: number;
    totalAmount: number;
  };
  poolReconciliation: Array<{
    poolId: string;
    poolName: string;
    periodConfirmedSessions: number;
    poolTotalSessions: number;
    poolConsumedTotal: number;
  }>;
  debitItems: Array<{
    debitId: string;
    timestamp: string;
    sessionQuantity: number;
    branchId: string | null;
    branchName: string | null;
    status: BenefitDebitStatus;
  }>;
  privacyNotice: string;
}

export interface CorporateReportQueryParams {
  startDate?: string;
  endDate?: string;
  branchId?: string;
}

export interface CorporateBillingStatementQueryParams extends CorporateReportQueryParams {
  unitPrice?: number;
}

