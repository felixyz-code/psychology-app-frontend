import type { Appointment } from '../../appointments/models/appointment.models';
import type { Document } from '../../documents/models/document.models';
import type { Patient } from '../../patients/models/patient.models';
import type { SessionNote } from '../../session-notes/models/session-note.models';

export interface CaseFile {
  id: string;
  patientId: string;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseFileRequest {
  patientId: string;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
}

export interface UpdateCaseFileRequest {
  diagnosis?: string | null;
  treatmentPlan?: string | null;
}

export interface CaseFileWorkspaceSummary {
  appointmentsCount: number;
  sessionNotesCount: number;
  documentsCount: number;
  lastActivityAt: string | null;
  nextAppointmentAt: string | null;
  lastAppointmentAt: string | null;
}

export type ClinicalTimelineEventType =
  | 'CASE_FILE_CREATED'
  | 'APPOINTMENT_COMPLETED'
  | 'SESSION_NOTE_CREATED'
  | 'DOCUMENT_UPLOADED';

export type ClinicalTimelineSourceType =
  | 'CASE_FILE'
  | 'APPOINTMENT'
  | 'SESSION_NOTE'
  | 'DOCUMENT';

export interface ClinicalTimelineEvent {
  id: string;
  type: ClinicalTimelineEventType;
  sourceType: ClinicalTimelineSourceType;
  sourceId?: string;
  occurredAt: string;
  title?: string | null;
  description?: string | null;
}

export interface CaseFileWorkspaceResponse {
  caseFile: CaseFile;
  patient: Patient;
  summary: CaseFileWorkspaceSummary;
  appointments: Appointment[];
  sessionNotes: SessionNote[];
  documents: Document[];
  timeline: ClinicalTimelineEvent[];
}
