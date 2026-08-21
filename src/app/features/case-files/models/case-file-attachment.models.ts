export type AttachmentCategory =
  | 'ESTUDIO_PREVIO'
  | 'REPORTE_ESCOLAR'
  | 'IDENTIFICACION'
  | 'OTRO';

export interface AttachmentUploader {
  id: string;
  name: string;
  email: string;
}

export interface CaseFileAttachment {
  id: string;
  caseFileId: string;
  organizationId?: string | null;
  uploadedById: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: AttachmentCategory;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: AttachmentUploader;
}

export interface UploadCaseFileAttachmentRequest {
  caseFileId: string;
  category?: AttachmentCategory;
  notes?: string;
  file: File;
}
