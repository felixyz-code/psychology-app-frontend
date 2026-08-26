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
  refreshToken?: string;
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
  refreshToken?: string;
  user: AuthUser;
  organization: FreelancerBootstrapOrganization;
  membership: FreelancerBootstrapMembership;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UserSessionItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface RevokeSessionResponse {
  success: boolean;
  message: string;
}

export interface RevokeOtherSessionsResponse {
  success: boolean;
  revokedCount: number;
  message: string;
}

