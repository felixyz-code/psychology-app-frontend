export interface ClinicalSummaryReportFilters {
  patientId: string;
  from?: string;
  to?: string;
}

export interface ClinicalSummaryReportSection {
  title: string;
  subtitle: string;
  emptyTitle?: string;
  emptyMessage?: string;
}

export interface ClinicalSummaryTimelineItem {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  occurredAtLabel: string;
  sourceType?: string;
}

export interface ClinicalSummaryNote {
  id: string;
  sessionDate: string;
  sessionDateLabel: string;
  title: string;
  excerpt: string;
}

export interface ClinicalSummaryDocument {
  id: string;
  fileName: string;
  typeLabel: string;
  uploadedAt: string;
  uploadedAtLabel: string;
}

export interface ClinicalSummaryMetric {
  label: string;
  value: string;
  supportingText: string;
}

export interface ClinicalSummaryContent {
  kind: 'summary';
  patientSection: ClinicalSummaryReportSection;
  generalInfoSection: ClinicalSummaryReportSection;
  evolutionSection: ClinicalSummaryReportSection;
  timelineSection: ClinicalSummaryReportSection;
  notesSection: ClinicalSummaryReportSection;
  documentsSection: ClinicalSummaryReportSection;
  patientFullName: string;
  patientInitials: string;
  patientDetails: Array<{ label: string; value: string }>;
  generalInfo: Array<{ label: string; value: string }>;
  kpis: ClinicalSummaryMetric[];
  evolutionSummary: string[];
  timelineItems: ClinicalSummaryTimelineItem[];
  notes: ClinicalSummaryNote[];
  hiddenNotesCount: number;
  documents: ClinicalSummaryDocument[];
}
