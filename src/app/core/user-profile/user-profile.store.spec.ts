import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../auth/auth.store';
import { UserProfileStore } from './user-profile.store';
import { UserProfileService } from './user-profile.service';
import { UserProfile } from './user-profile.models';

describe('UserProfileStore', () => {
  let store: UserProfileStore;
  let mockService: {
    getProfile: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    getAvatarMetadata: ReturnType<typeof vi.fn>;
    getAvatarBlob: ReturnType<typeof vi.fn>;
    uploadAvatar: ReturnType<typeof vi.fn>;
    removeAvatar: ReturnType<typeof vi.fn>;
    getSignatureMetadata: ReturnType<typeof vi.fn>;
    getSignatureBlob: ReturnType<typeof vi.fn>;
    uploadSignature: ReturnType<typeof vi.fn>;
    removeSignature: ReturnType<typeof vi.fn>;
  };
  let mockAuthStore: {
    user: () => { name: string } | null;
    updateUser: ReturnType<typeof vi.fn>;
  };

  const mockProfile: UserProfile = {
    id: 'prof-1',
    userId: 'user-1',
    email: 'doc@example.com',
    role: 'PSYCHOLOGIST',
    professionalName: 'Dra. María Elena',
    licenseNumber: '12345678',
    phone: '5551234567',
    specialties: ['TCC', 'Clínica'],
    bio: 'Semblanza profesional',
    status: 'ACTIVE',
    hasAvatar: false,
    hasSignature: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  };

  beforeEach(() => {
    mockService = {
      getProfile: vi.fn().mockReturnValue(of(mockProfile)),
      updateProfile: vi.fn(),
      getAvatarMetadata: vi.fn().mockReturnValue(of({ rowState: 'ABSENT' })),
      getAvatarBlob: vi.fn(),
      uploadAvatar: vi.fn(),
      removeAvatar: vi.fn(),
      getSignatureMetadata: vi.fn().mockReturnValue(of({ rowState: 'ABSENT' })),
      getSignatureBlob: vi.fn(),
      uploadSignature: vi.fn(),
      removeSignature: vi.fn(),
    };

    const userSignal = vi.fn().mockReturnValue({ name: 'Dra. María Elena' }) as any;
    mockAuthStore = {
      user: userSignal,
      updateUser: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        UserProfileStore,
        { provide: UserProfileService, useValue: mockService },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });

    store = TestBed.inject(UserProfileStore);
  });

  it('loads profile successfully and populates signals', () => {
    store.loadProfile();
    expect(mockService.getProfile).toHaveBeenCalled();
    expect(store.profile()).toEqual(mockProfile);
    expect(store.isLoading()).toBe(false);
  });

  it('updates profile and invokes callback', () => {
    const updated = { ...mockProfile, professionalName: 'Dra. María Elena Actualizada' };
    mockService.updateProfile.mockReturnValue(of(updated));
    const onSuccess = vi.fn();

    store.updateProfile({ professionalName: 'Dra. María Elena Actualizada' }, onSuccess);

    expect(mockService.updateProfile).toHaveBeenCalledWith({
      professionalName: 'Dra. María Elena Actualizada',
    });
    expect(store.profile()).toEqual(updated);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('handles profile load failure gracefully', () => {
    mockService.getProfile.mockReturnValue(
      throwError(() => ({ error: { message: 'Server error' } })),
    );

    store.loadProfile();

    expect(store.errorMessage()).toBe('Server error');
    expect(store.isLoading()).toBe(false);
  });
});
