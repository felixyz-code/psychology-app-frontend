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

export interface TimezoneOption {
  id: string;
  label: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  {
    id: 'America/Hermosillo',
    label: '(GMT-7) America/Hermosillo — Sonora / Arizona sin DST',
  },
  {
    id: 'America/Phoenix',
    label: '(GMT-7) America/Phoenix — Arizona',
  },
  {
    id: 'America/Tijuana',
    label: '(GMT-8) America/Tijuana — Baja California / Pacífico',
  },
  {
    id: 'America/Mazatlan',
    label: '(GMT-7) America/Mazatlan — Sinaloa / Nayarit',
  },
  {
    id: 'America/Ciudad_Juarez',
    label: '(GMT-6) America/Ciudad_Juarez — Chihuahua / Frontera',
  },
  {
    id: 'America/Cancun',
    label: '(GMT-5) America/Cancun — Quintana Roo / Sureste',
  },
  {
    id: 'America/Mexico_City',
    label: '(GMT-6) America/Mexico_City — Centro / CDMX',
  },
  {
    id: 'America/Monterrey',
    label: '(GMT-6) America/Monterrey — Noreste',
  },
  {
    id: 'America/Bogota',
    label: '(GMT-5) America/Bogota — Colombia',
  },
  {
    id: 'America/Lima',
    label: '(GMT-5) America/Lima — Perú',
  },
  {
    id: 'America/Santiago',
    label: '(GMT-4) America/Santiago — Chile',
  },
  {
    id: 'America/Argentina/Buenos_Aires',
    label: '(GMT-3) America/Argentina/Buenos_Aires — Argentina',
  },
  {
    id: 'America/Caracas',
    label: '(GMT-4) America/Caracas — Venezuela',
  },
  {
    id: 'America/Montevideo',
    label: '(GMT-3) America/Montevideo — Uruguay',
  },
  {
    id: 'America/Guatemala',
    label: '(GMT-6) America/Guatemala — Centroamérica',
  },
  {
    id: 'America/Costa_Rica',
    label: '(GMT-6) America/Costa_Rica — Costa Rica',
  },
  {
    id: 'America/Panama',
    label: '(GMT-5) America/Panama — Panamá',
  },
  {
    id: 'America/New_York',
    label: '(GMT-5) America/New_York — Eastern US',
  },
  {
    id: 'America/Chicago',
    label: '(GMT-6) America/Chicago — Central US',
  },
  {
    id: 'America/Los_Angeles',
    label: '(GMT-8) America/Los_Angeles — Pacific US',
  },
  {
    id: 'America/Sao_Paulo',
    label: '(GMT-3) America/Sao_Paulo — Brasil',
  },
  {
    id: 'Europe/Madrid',
    label: '(GMT+1) Europe/Madrid — España (Península)',
  },
  {
    id: 'UTC',
    label: '(GMT+0) UTC — Universal Coordinated Time',
  },
];

export const COMMON_TIMEZONES: string[] = TIMEZONE_OPTIONS.map((tz) => tz.id);

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
