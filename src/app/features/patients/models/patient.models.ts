export interface Patient {
  id: string;
  psychologistId: string;
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
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  email?: string | null;
  birthDate?: string | null;
}

export interface UpdatePatientRequest {
  psychologistId?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  email?: string | null;
  birthDate?: string | null;
}
