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
  tradeName?: string | null;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
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
  tradeName?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

export interface ChangeOrganizationStatusDto {
  status: OrganizationStatus;
}
