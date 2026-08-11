export type UserRole = 'ADMIN' | 'PSYCHOLOGIST';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface FreelancerBootstrapRequest {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

export interface FreelancerBootstrapOrganization {
  id: string;
  slug: string;
  legalName: string;
  displayName: string;
  status: 'ACTIVE';
  timezone: string;
  locale: string;
  currency: string;
}

export interface FreelancerBootstrapMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: 'OWNER';
  status: 'ACTIVE';
  joinedAt: string;
}

export interface FreelancerBootstrapResponse {
  accessToken: string;
  user: AuthUser;
  organization: FreelancerBootstrapOrganization;
  membership: FreelancerBootstrapMembership;
}
