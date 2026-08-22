export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';

export type NotificationEventType =
  | 'APPOINTMENT_CONFIRMATION'
  | 'APPOINTMENT_REMINDER_24H'
  | 'APPOINTMENT_REMINDER_2H'
  | 'APPOINTMENT_RESCHEDULED'
  | 'APPOINTMENT_CANCELLED';

export interface NotificationTemplate {
  id: string;
  organizationId: string;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  name: string;
  subject?: string | null;
  body: string;
  variables?: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationTemplatePayload {
  channel: NotificationChannel;
  eventType: NotificationEventType;
  name: string;
  subject?: string;
  body: string;
  variables?: string[];
  isActive?: boolean;
}

export interface UpdateNotificationTemplatePayload {
  name?: string;
  subject?: string;
  body?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface QueryNotificationTemplatesParams {
  channel?: NotificationChannel;
  eventType?: NotificationEventType;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface RenderPreviewRequest {
  templateId?: string;
  channel?: NotificationChannel;
  eventType?: NotificationEventType;
  subject?: string;
  body?: string;
  customContext?: Record<string, any>;
}

export interface RenderPreviewResponse {
  renderedSubject?: string;
  renderedBody: string;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  detectedVariables: string[];
  unmappedVariables: string[];
  contextUsed: Record<string, string>;
}

export interface TemplateVariableMetadata {
  key: string;
  label: string;
  description: string;
  exampleValue: string;
  category: 'patient' | 'therapist' | 'appointment' | 'organization' | 'general';
}

export const EVENT_TYPE_LABELS: Record<NotificationEventType, string> = {
  APPOINTMENT_CONFIRMATION: 'Confirmación de Cita',
  APPOINTMENT_REMINDER_24H: 'Recordatorio 24 Horas',
  APPOINTMENT_REMINDER_2H: 'Recordatorio 2 Horas',
  APPOINTMENT_RESCHEDULED: 'Cita Reprogramada',
  APPOINTMENT_CANCELLED: 'Cancelación de Cita',
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
};

export const CHANNEL_ICONS: Record<NotificationChannel, string> = {
  EMAIL: 'mail',
  WHATSAPP: 'chat',
  SMS: 'sms',
};
