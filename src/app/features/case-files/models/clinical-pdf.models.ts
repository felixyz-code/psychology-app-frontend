export type ClinicalDocumentType =
  | 'NOM_004_EVOLUTION_NOTE'
  | 'THERAPEUTIC_PRESCRIPTION'
  | 'INFORMED_CONSENT'
  | 'CASE_FILE_SUMMARY';

export interface ClinicalDocumentTenant {
  organizationId: string;
  legalName: string;
  displayName: string;
  tradeName?: string | null;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  logoDataUri?: string | null;
}

export interface ClinicalDocumentTherapist {
  id: string;
  name: string;
  professionalName: string;
  licenseNumber?: string | null;
  specialties: string[];
  phone?: string | null;
  email?: string | null;
  signatureDataUri?: string | null;
}

export interface ClinicalDocumentPatient {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  age?: number | null;
  phoneNumber?: string | null;
  email?: string | null;
}

export interface ClinicalDocumentCaseFile {
  id: string;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalDocumentSessionNote {
  id: string;
  sessionDate: string;
  title?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalDocumentAppointment {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  notes?: string | null;
}

export interface ClinicalPdfExportPayload {
  documentType: ClinicalDocumentType;
  generatedAt: string;
  tenant: ClinicalDocumentTenant;
  therapist: ClinicalDocumentTherapist;
  patient: ClinicalDocumentPatient;
  caseFile: ClinicalDocumentCaseFile;
  sessionNote?: ClinicalDocumentSessionNote | null;
  appointment?: ClinicalDocumentAppointment | null;
}

export interface ClinicalDocumentPreviewDialogData {
  payload: ClinicalPdfExportPayload;
  initialDocumentType?: ClinicalDocumentType;
  caseFileId?: string;
  noteId?: string;
}
