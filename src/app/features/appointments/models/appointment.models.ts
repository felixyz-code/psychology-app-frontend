export type AppointmentStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Appointment {
  id: string;
  patientId: string;
  psychologistId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  psychologistId: string;
  scheduledAt: string;
  durationMinutes: number;
  status?: AppointmentStatus;
  notes?: string | null;
}

export interface UpdateAppointmentRequest {
  patientId?: string;
  psychologistId?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  status?: AppointmentStatus;
  notes?: string | null;
}
