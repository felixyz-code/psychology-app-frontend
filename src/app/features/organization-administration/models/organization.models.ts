export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED';

export interface OrganizationDetails {
  id: string;
  slug: string;
  legalName: string;
  displayName: string;
  status: OrganizationStatus;
  timezone: string;
  locale: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationDto {
  legalName?: string;
  displayName?: string;
  slug?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
}

export interface ChangeOrganizationStatusDto {
  status: OrganizationStatus;
}
