export interface ClinicalRecordReportFilters {
  patientId: string;
  from?: string;
  to?: string;
}

export interface ClinicalRecordReportSection {
  title: string;
  subtitle: string;
  emptyTitle?: string;
  emptyMessage?: string;
}

export interface ClinicalRecordField {
  label: string;
  value: string;
}

export interface ClinicalRecordAppointmentItem {
  id: string;
  scheduledAt: string;
  scheduledAtLabel: string;
  statusLabel: string;
  durationLabel: string;
  notes: string;
}

export interface ClinicalRecordNoteItem {
  id: string;
  sessionDate: string;
  sessionDateLabel: string;
  title: string;
  content: string;
}

export interface ClinicalRecordDocumentItem {
  id: string;
  fileName: string;
  typeLabel: string;
  uploadedAt: string;
  uploadedAtLabel: string;
}

export interface ClinicalRecordTimelineItem {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  occurredAtLabel: string;
}

export interface ClinicalRecordContent {
  kind: 'record';
  documentTitle: string;
  patientFullName: string;
  patientInitials: string;
  generatedAtLabel: string;
  periodLabel: string;
  patientSection: ClinicalRecordReportSection;
  recordSection: ClinicalRecordReportSection;
  diagnosisSection: ClinicalRecordReportSection;
  treatmentPlanSection: ClinicalRecordReportSection;
  appointmentsSection: ClinicalRecordReportSection;
  notesSection: ClinicalRecordReportSection;
  documentsSection: ClinicalRecordReportSection;
  timelineSection: ClinicalRecordReportSection;
  referencesSection: ClinicalRecordReportSection;
  patientDetails: ClinicalRecordField[];
  recordDetails: ClinicalRecordField[];
  diagnosis: string;
  treatmentPlan: string;
  appointments: ClinicalRecordAppointmentItem[];
  notes: ClinicalRecordNoteItem[];
  documents: ClinicalRecordDocumentItem[];
  timelineItems: ClinicalRecordTimelineItem[];
  references: ClinicalRecordField[];
}
