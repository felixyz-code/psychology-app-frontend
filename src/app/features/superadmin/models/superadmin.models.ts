export type TenantSubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'LIFETIME_SPONSOR'
  | 'FROZEN';

export type PlanTier = 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM';

export type OrganizationStatus =
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ARCHIVED';

export interface AdminTenantSubscription {
  id: string;
  status: TenantSubscriptionStatus;
  planTier: PlanTier;
  planCode: string;
  planName: string;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  isExempt: boolean;
  sponsorNotes?: string | null;
  customTherapistsLimit?: number | null;
  customPatientsLimit?: number | null;
  customBranchesLimit?: number | null;
}

export interface AdminTenantUsage {
  therapistsCount: number;
  patientsCount: number;
  branchesCount: number;
  therapistsLimit: number;
  patientsLimit: number;
  branchesLimit: number;
}

export interface AdminTenantItem {
  id: string;
  slug: string;
  displayName: string;
  legalName: string;
  status: OrganizationStatus;
  timezone: string;
  createdAt: string;
  subscription?: AdminTenantSubscription | null;
  usage: AdminTenantUsage;
}

export interface ExtendTrialPayload {
  daysToAdd?: number;
}

export interface GrantLifetimePayload {
  sponsorNotes?: string;
  customTherapistsLimit?: number;
  customPatientsLimit?: number;
  customBranchesLimit?: number;
}

export interface UpdateQuotasPayload {
  customTherapistsLimit?: number | null;
  customPatientsLimit?: number | null;
  customBranchesLimit?: number | null;
}

export interface FreezeTenantPayload {
  freeze: boolean;
  reason?: string;
}

export interface FreezeTenantResponse {
  success: boolean;
  isFrozen: boolean;
  message: string;
}

export interface PlatformMetricsTenants {
  total: number;
  active: number;
  suspended: number;
  trialing: number;
  lifetime: number;
  activeSubscriptions: number;
}

export interface PlatformMetricsAggregates {
  totalPatients: number;
  totalAppointments: number;
  totalUsers: number;
}

export interface PlatformMetricsMemory {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
}

export interface PlatformMetricsResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  uptimeSeconds: number;
  serverTimestamp: string;
  environment: string;
  databaseStatus: string;
  tenants: PlatformMetricsTenants;
  aggregates: PlatformMetricsAggregates;
  memory: PlatformMetricsMemory;
}

