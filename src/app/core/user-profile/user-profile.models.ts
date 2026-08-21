export type UserTimeFormat = 'TWELVE_HOUR' | 'TWENTY_FOUR_HOUR';
export type UserDateFormat = 'DD_MM_YYYY' | 'YYYY_MM_DD' | 'MM_DD_YYYY';

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  role: 'ADMIN' | 'PSYCHOLOGIST';
  professionalName: string;
  licenseNumber: string | null;
  phone: string | null;
  specialties: string[];
  bio: string | null;
  status: 'LEGACY_UNVERIFIED' | 'ACTIVE' | 'SUSPENDED';
  hasAvatar: boolean;
  hasSignature: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfilePayload {
  professionalName?: string;
  licenseNumber?: string | null;
  phone?: string | null;
  specialties?: string[];
  bio?: string | null;
}

export interface UserAssetMetadata {
  rowState: 'ABSENT' | 'PRESENT';
  mimeType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  updatedAt: string | null;
}

export interface UserPreferences {
  userId: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  appointmentReminders: boolean;
  reminderAdvanceMinutes: number;
  sessionDigest: boolean;
  timeZone: string;
  timeFormat: UserTimeFormat;
  dateFormat: UserDateFormat;
  locale: string;
  weekStartsOn: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPreferencesPayload {
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  appointmentReminders?: boolean;
  reminderAdvanceMinutes?: number;
  sessionDigest?: boolean;
  timeZone?: string;
  timeFormat?: UserTimeFormat;
  dateFormat?: UserDateFormat;
  locale?: string;
  weekStartsOn?: number;
}

export const COMMON_TIMEZONES = [
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Caracas',
  'America/Montevideo',
  'America/Guatemala',
  'America/Costa_Rica',
  'America/Panama',
  'America/Tijuana',
  'America/Monterrey',
  'America/Cancun',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/Madrid',
  'UTC',
];

export interface LocaleOption {
  code: string;
  label: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: 'es-MX', label: 'Español (México)', flag: '🇲🇽' },
  { code: 'es-ES', label: 'Español (España)', flag: '🇪🇸' },
  { code: 'es-CO', label: 'Español (Colombia)', flag: '🇨🇴' },
  { code: 'es-AR', label: 'Español (Argentina)', flag: '🇦🇷' },
  { code: 'es-CL', label: 'Español (Chile)', flag: '🇨🇱' },
  { code: 'en-US', label: 'English (United States)', flag: '🇺🇸' },
  { code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
];

export interface ReminderOption {
  value: number;
  label: string;
}

export const REMINDER_OPTIONS: ReminderOption[] = [
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '24 horas antes (1 día)' },
];
