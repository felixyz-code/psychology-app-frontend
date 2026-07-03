import type { CaseFile } from '../../case-files/models/case-file.models';
import type { Patient } from '../../patients/models/patient.models';

export interface Document {
  id: string;
  caseFileId: string;
  uploadedById: string;
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  patientId?: string | null;
  patient?: Patient | null;
  caseFile?: (CaseFile & { patient?: Patient | null }) | null;
  uploadedAt: string;
  updatedAt: string;
}

export interface UpdateDocumentRequest {
  fileName: string;
  mimeType?: string;
  filePath?: string;
}

export interface UploadDocumentRequest {
  caseFileId: string;
  file: File;
}
