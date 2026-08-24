export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

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

export interface RescheduleAppointmentRequest {
  scheduledAt: string;
  durationMinutes?: number;
  reason?: string;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
  conflictType?: 'APPOINTMENT' | 'SCHEDULE_BLOCK';
  title?: string;
}

export interface AvailabilityResponse {
  therapistId: string;
  date: string;
  slotDurationMinutes: number;
  slots: AvailabilitySlot[];
}

export interface AvailabilityQuery {
  therapistId: string;
  date: string;
  durationMinutes?: number;
  startHour?: number;
  endHour?: number;
}

export interface ScheduleBlock {
  id: string;
  organizationId?: string | null;
  therapistId: string;
  title: string;
  reason?: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleBlockRequest {
  therapistId?: string;
  title: string;
  reason?: string;
  startTime: string;
  endTime: string;
}

export interface QueryScheduleBlocksParams {
  therapistId?: string;
  startDate?: string;
  endDate?: string;
}

// ─── Teleconsultation ────────────────────────────────────────────────────────

export type TeleconsultationRoomStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface TeleconsultationRoom {
  id: string;
  appointmentId: string;
  organizationId: string | null;
  roomCode: string;
  provider: string;
  therapistPasscode: string;
  patientToken: string;
  expiresAt: string;
  status: TeleconsultationRoomStatus;
  createdAt: string;
  updatedAt: string;
}
