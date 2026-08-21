export type OrganizationConfigurationRowState = 'ABSENT' | 'PRESENT';

export interface OrganizationSettingsResponse {
  rowState: OrganizationConfigurationRowState;
  updatedAt: string | null;
  defaultAppointmentDuration: number;
  persistedDefaultAppointmentDuration: number | null;
}

export interface OrganizationBrandingResponse {
  rowState: OrganizationConfigurationRowState;
  updatedAt: string | null;
  visualName: string | null;
  primaryColor: string | null;
  accentColor: string | null;
}

export type OrganizationSettingsUpdateRequest =
  | { defaultAppointmentDuration: number | null; expectedRowState: 'ABSENT' }
  | { defaultAppointmentDuration: number | null; expectedUpdatedAt: string };

export type OrganizationBrandingUpdateRequest =
  | {
      visualName?: string | null;
      primaryColor: string | null;
      accentColor?: string | null;
      expectedRowState: 'ABSENT';
    }
  | {
      visualName?: string | null;
      primaryColor: string | null;
      accentColor?: string | null;
      expectedUpdatedAt: string;
    };
