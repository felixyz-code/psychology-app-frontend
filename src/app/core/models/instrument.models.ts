import { InstrumentDefinition, ScoringSpec } from './scoring.types';

export enum InstrumentVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  DEPRECATED = 'DEPRECATED',
}

export interface InstrumentVersion {
  id: string;
  instrumentId: string;
  versionNumber: number;
  status: InstrumentVersionStatus;
  definitionJson?: InstrumentDefinition;
  scoringSpecJson?: ScoringSpec;
  createdAt: string;
  publishedAt?: string | null;
  administrationsCount?: number;
  isLocked?: boolean;
}

export interface Instrument {
  id: string;
  organizationId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  targetPopulation?: string | null;
  isSystem: boolean;
  isEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  versions?: InstrumentVersion[];
  versionsCount?: number;
  hasActiveAdministrations?: boolean;
  latestVersion?: InstrumentVersion | null;
  publishedVersion?: InstrumentVersion | null;
  draftVersion?: InstrumentVersion | null;
}

export interface CreateInstrumentRequest {
  code: string;
  name: string;
  description?: string;
  targetPopulation?: string;
  initialDraft?: {
    definitionJson: InstrumentDefinition;
    scoringSpecJson: ScoringSpec;
  };
}

export interface CreateInstrumentVersionRequest {
  definitionJson: InstrumentDefinition;
  scoringSpecJson: ScoringSpec;
}
