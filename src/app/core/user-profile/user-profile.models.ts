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
