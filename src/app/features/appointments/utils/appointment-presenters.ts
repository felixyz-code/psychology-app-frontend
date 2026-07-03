import { StatusBadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { AppointmentStatus } from '../models/appointment.models';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export function getAppointmentStatusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    SCHEDULED: 'Programada',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'No asistio',
  };

  return labels[status];
}

export function getAppointmentStatusVariant(status: AppointmentStatus): StatusBadgeVariant {
  const variants: Record<AppointmentStatus, StatusBadgeVariant> = {
    SCHEDULED: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    NO_SHOW: 'warning',
  };

  return variants[status];
}
