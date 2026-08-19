import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileStore } from '../../../core/user-profile/user-profile.store';
import { UserProfile } from '../../../core/user-profile/user-profile.models';
import { UserProfilePage } from './user-profile.page';

describe('UserProfilePage', () => {
  let component: UserProfilePage;
  let fixture: ComponentFixture<UserProfilePage>;
  let mockStore: {
    profile: ReturnType<typeof signal<UserProfile | null>>;
    avatarUrl: ReturnType<typeof signal<string | null>>;
    signatureUrl: ReturnType<typeof signal<string | null>>;
    hasAvatar: ReturnType<typeof signal<boolean>>;
    hasSignature: ReturnType<typeof signal<boolean>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    isSaving: ReturnType<typeof signal<boolean>>;
    isUploadingAvatar: ReturnType<typeof signal<boolean>>;
    isUploadingSignature: ReturnType<typeof signal<boolean>>;
    errorMessage: ReturnType<typeof signal<string | null>>;
    loadProfile: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    uploadAvatar: ReturnType<typeof vi.fn>;
    removeAvatar: ReturnType<typeof vi.fn>;
    uploadSignature: ReturnType<typeof vi.fn>;
    removeSignature: ReturnType<typeof vi.fn>;
  };

  const mockProfile: UserProfile = {
    id: 'prof-1',
    userId: 'user-1',
    email: 'elena.rivera@example.com',
    role: 'PSYCHOLOGIST',
    professionalName: 'Dra. Elena Rivera',
    licenseNumber: '87654321',
    phone: '+52 55 9876 5432',
    specialties: ['Terapia Cognitivo-Conductual', 'Neuropsicología'],
    bio: 'Semblanza profesional de la Dra. Elena.',
    status: 'ACTIVE',
    hasAvatar: false,
    hasSignature: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  };

  beforeEach(async () => {
    mockStore = {
      profile: signal<UserProfile | null>(mockProfile),
      avatarUrl: signal<string | null>(null),
      signatureUrl: signal<string | null>(null),
      hasAvatar: signal<boolean>(false),
      hasSignature: signal<boolean>(false),
      isLoading: signal<boolean>(false),
      isSaving: signal<boolean>(false),
      isUploadingAvatar: signal<boolean>(false),
      isUploadingSignature: signal<boolean>(false),
      errorMessage: signal<string | null>(null),
      loadProfile: vi.fn(),
      updateProfile: vi.fn(),
      uploadAvatar: vi.fn(),
      removeAvatar: vi.fn(),
      uploadSignature: vi.fn(),
      removeSignature: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UserProfilePage],
      providers: [
        { provide: UserProfileStore, useValue: mockStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes form with profile values', () => {
    expect(component.profileForm.get('professionalName')?.value).toBe(
      'Dra. Elena Rivera',
    );
    expect(component.profileForm.get('licenseNumber')?.value).toBe('87654321');
    expect(component.profileForm.get('phone')?.value).toBe('+52 55 9876 5432');
    expect(component.specialties()).toEqual([
      'Terapia Cognitivo-Conductual',
      'Neuropsicología',
    ]);
  });

  it('computes correct user initials from professional name', () => {
    expect(component.userInitials()).toBe('DE');
  });

  it('adds and removes specialties', () => {
    component.addSuggestedSpecialty('Psicología Clínica');
    expect(component.specialties()).toContain('Psicología Clínica');

    component.removeSpecialty('Psicología Clínica');
    expect(component.specialties()).not.toContain('Psicología Clínica');
  });

  it('submits updated profile data to store', () => {
    component.profileForm.patchValue({
      professionalName: 'Dra. Elena Rivera Actualizada',
      licenseNumber: '99999999',
    });

    component.submitProfile();

    expect(mockStore.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalName: 'Dra. Elena Rivera Actualizada',
        licenseNumber: '99999999',
      }),
      expect.any(Function),
    );
  });
});
