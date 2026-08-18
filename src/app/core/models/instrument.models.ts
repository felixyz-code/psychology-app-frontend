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
}

export interface Instrument {
  id: string;
  organizationId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  targetPopulation?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  versions?: InstrumentVersion[];
}
