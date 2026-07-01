export interface Document {
  id: string;
  caseFileId: string;
  uploadedById: string;
  fileName: string;
  filePath: string;
  mimeType?: string | null;
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
