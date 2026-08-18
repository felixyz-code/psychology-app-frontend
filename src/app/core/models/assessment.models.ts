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
