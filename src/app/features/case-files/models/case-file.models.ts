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
