export interface Patient {
  id: string;
  psychologistId: string;
  branchId?: string | null;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  email?: string | null;
  birthDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientRequest {
  psychologistId?: string;
  branchId?: string | null;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  email?: string | null;
  birthDate?: string | null;
}

export interface UpdatePatientRequest {
  psychologistId?: string;
  branchId?: string | null;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  email?: string | null;
  birthDate?: string | null;
}

export interface TransferPatientRequest {
  targetBranchId: string;
  targetPsychologistId?: string;
  reason: string;
}
