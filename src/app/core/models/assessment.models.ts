import { InstrumentDefinition, ScoringResult, ScoringSpec } from './scoring.types';

export enum AdministrationStatus {
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface AssessmentAdministration {
  id: string;
  organizationId: string;
  branchId?: string | null;
  patientId: string;
  professionalId: string;
  caseFileId?: string | null;
  instrumentVersionId: string;
  status: AdministrationStatus;
  accessToken?: string | null;
  expiresAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
  };
  professional?: {
    id: string;
    name: string;
    email: string;
  };
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
  caseFile?: {
    id: string;
    diagnosis?: string | null;
    treatmentPlan?: string | null;
  } | null;
  instrumentVersion?: {
    id: string;
    versionNumber: number;
    definitionJson?: InstrumentDefinition;
    scoringSpecJson?: ScoringSpec;
    instrument?: {
      id: string;
      code: string;
      name: string;
      targetPopulation?: string | null;
    };
  };
  responses?: AssessmentResponse[];
  result?: AssessmentResult | null;
}

export interface AssessmentResponse {
  id: string;
  administrationId: string;
  itemCode: string;
  responseValue: string | number | boolean | string[] | null;
  numericWeight?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResult {
  id: string;
  administrationId: string;
  rawScore: number;
  normalizedScore?: number | null;
  strataCode?: string | null;
  strataTitle?: string | null;
  severity?: string | null;
  subscaleScoresJson?: Record<string, any> | null;
  flagsJson?: any[] | null;
  scoringSpecSnapshotJson: Record<string, any>;
  createdAt: string;
}

export interface AssignAssessmentRequest {
  patientId: string;
  instrumentVersionId: string;
  branchId?: string;
  caseFileId?: string;
  expiresAt?: string;
  isRemoteSelfAdministered?: boolean;
}

export interface SaveResponsesRequest {
  responses: Record<string, string | number | boolean | string[] | null>;
}

export interface AssessmentAdministrationListResponse {
  data: AssessmentAdministration[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CompleteAssessmentResponse {
  administrationId: string;
  status: AdministrationStatus;
  completedAt: string;
  result: Partial<ScoringResult> & {
    id?: string;
    severity?: string | null;
  };
}

// ============================================================
// Subfase 9.5 — Psychometric Report & Longitudinal Interfaces
// ============================================================

export interface SubscaleReportEntry {
  scaleCode: string;
  scaleName: string;
  rawScore: number;
  normalizedScore: number;
  minPossibleScore: number;
  maxPossibleScore: number;
  strataCode: string | null;
  strataTitle: string | null;
  severity: string | null;
  strataDescription: string | null;
  isComplete: boolean;
}

export interface ClinicalAlertReportEntry {
  alertType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  itemCode: string;
  message: string;
  actualValue: string | number | boolean | null;
  actualWeight: number | null;
}

export interface ItemResponseReportEntry {
  itemCode: string;
  sequenceNumber: number;
  prompt: string;
  responseValue: string | number | boolean | string[] | null;
  responseLabel: string | null;
  numericWeight: number | null;
  isRequired: boolean;
  dimensionCode: string | null;
}

export interface PsychometricReportDto {
  reportGeneratedAt: string;
  reportVersion: string;
  organization: {
    id: string;
    legalName: string;
    displayName: string;
    slug: string;
    primaryColor: string | null;
    accentColor: string | null;
    logoUrl: string | null;
  };
  branch: {
    id: string | null;
    name: string | null;
    code: string | null;
    address: string | null;
    phone: string | null;
    timezone: string | null;
  };
  professional: {
    id: string;
    name: string;
    email: string;
    professionalName: string | null;
    licenseNumber: string | null;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string | null;
    birthDate: string | null;
    age: number | null;
  };
  instrument: {
    id: string;
    code: string;
    name: string;
    acronym: string;
    author: string | null;
    targetPopulation: string | null;
    versionNumber: number;
    administrationMode: 'SELF_ADMINISTERED' | 'CLINICIAN_ADMINISTERED' | null;
    estimatedTimeMinutes: number | null;
  };
  administration: {
    id: string;
    assignedAt: string;
    startedAt: string | null;
    completedAt: string;
    durationMinutes: number | null;
  };
  result: {
    rawScore: number;
    normalizedScore: number | null;
    strataCode: string | null;
    strataTitle: string | null;
    severity: string | null;
    strataDescription: string | null;
    minPossibleScore: number | null;
    maxPossibleScore: number | null;
    subscales: SubscaleReportEntry[];
    clinicalAlerts: ClinicalAlertReportEntry[];
    scoringSpecSnapshot: Record<string, any>;
  };
  itemResponses: ItemResponseReportEntry[];
  legalDisclaimer: string;
}

export interface LongitudinalDeltaResult {
  previousAdministrationId: string | null;
  rawScoreDelta: number | null;
  severityChange: 'IMPROVED' | 'WORSENED' | 'STABLE' | 'NO_PREVIOUS' | 'UNCLASSIFIABLE';
  clinicalSignificance: 'CLINICALLY_SIGNIFICANT' | 'MINIMAL_CHANGE' | 'NO_PREVIOUS';
}

export interface LongitudinalSubscaleSummary {
  scaleCode: string;
  scaleName: string;
  rawScore: number;
  severity: string | null;
}

export interface LongitudinalDataPoint {
  administrationId: string;
  instrumentCode: string;
  instrumentName: string;
  versionNumber: number;
  completedAt: string;
  rawScore: number;
  normalizedScore: number | null;
  strataCode: string | null;
  strataTitle: string | null;
  severity: string | null;
  delta: LongitudinalDeltaResult | null;
  activeCriticalAlerts: number;
  hasRiskFlag: boolean;
  subscaleSummary: LongitudinalSubscaleSummary[];
}

export interface LongitudinalAssessmentSeriesDto {
  patientId: string;
  patientName: string;
  instrumentCode: string | null;
  series: LongitudinalDataPoint[];
  summary: {
    totalCompletedAssessments: number;
    firstAssessmentAt: string | null;
    lastAssessmentAt: string | null;
    scoreMin: number | null;
    scoreMax: number | null;
    scoreAverage: number | null;
    scoreTrend: 'IMPROVING' | 'WORSENING' | 'STABLE' | 'INSUFFICIENT_DATA';
    severityDistribution: Record<string, number>;
  };
}
