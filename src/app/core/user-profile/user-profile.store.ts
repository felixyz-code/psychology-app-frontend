import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import {
  UpdateUserPreferencesPayload,
  UpdateUserProfilePayload,
  UserAssetMetadata,
  UserPreferences,
  UserProfile,
} from './user-profile.models';
import { UserProfileService } from './user-profile.service';

@Injectable({ providedIn: 'root' })
export class UserProfileStore {
  private readonly profileService = inject(UserProfileService);
  private readonly authStore = inject(AuthStore);

  readonly profile = signal<UserProfile | null>(null);
  readonly preferences = signal<UserPreferences | null>(null);
  readonly avatarMetadata = signal<UserAssetMetadata | null>(null);
  readonly signatureMetadata = signal<UserAssetMetadata | null>(null);
  readonly avatarUrl = signal<string | null>(null);
  readonly signatureUrl = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isLoadingPreferences = signal<boolean>(false);
  readonly isSavingPreferences = signal<boolean>(false);
  readonly isUploadingAvatar = signal<boolean>(false);
  readonly isUploadingSignature = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly preferencesError = signal<string | null>(null);

  readonly hasAvatar = computed(() => this.avatarMetadata()?.rowState === 'PRESENT');
  readonly hasSignature = computed(() => this.signatureMetadata()?.rowState === 'PRESENT');

  loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.profileService
      .getProfile()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          if (profile.hasAvatar) {
            this.loadAvatarBlob();
          } else {
            this.clearAvatarUrl();
          }
          if (profile.hasSignature) {
            this.loadSignatureBlob();
          } else {
            this.clearSignatureUrl();
          }
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message || 'No se pudo cargar el perfil profesional.',
          );
        },
      });

    this.loadMetadata();
    this.loadPreferences();
  }

  loadPreferences(): void {
    this.isLoadingPreferences.set(true);
    this.preferencesError.set(null);

    this.profileService
      .getPreferences()
      .pipe(finalize(() => this.isLoadingPreferences.set(false)))
      .subscribe({
        next: (prefs) => {
          this.preferences.set(prefs);
        },
        error: (err) => {
          this.preferencesError.set(
            err?.error?.message || 'No se pudieron cargar las preferencias de usuario.',
          );
        },
      });
  }

  updatePreferences(
    payload: UpdateUserPreferencesPayload,
    onSuccess?: () => void,
  ): void {
    this.isSavingPreferences.set(true);
    this.preferencesError.set(null);

    this.profileService
      .updatePreferences(payload)
      .pipe(finalize(() => this.isSavingPreferences.set(false)))
      .subscribe({
        next: (prefs) => {
          this.preferences.set(prefs);
          onSuccess?.();
        },
        error: (err) => {
          this.preferencesError.set(
            err?.error?.message || 'No se pudieron guardar las preferencias.',
          );
        },
      });
  }

  loadMetadata(): void {
    this.profileService.getAvatarMetadata().subscribe({
      next: (meta) => this.avatarMetadata.set(meta),
      error: () => {},
    });
    this.profileService.getSignatureMetadata().subscribe({
      next: (meta) => this.signatureMetadata.set(meta),
      error: () => {},
    });
  }

  loadAvatarBlob(): void {
    this.profileService.getAvatarBlob().subscribe({
      next: (blob) => {
        this.clearAvatarUrl();
        const url = URL.createObjectURL(blob);
        this.avatarUrl.set(url);
      },
      error: () => this.clearAvatarUrl(),
    });
  }

  loadSignatureBlob(): void {
    this.profileService.getSignatureBlob().subscribe({
      next: (blob) => {
        this.clearSignatureUrl();
        const url = URL.createObjectURL(blob);
        this.signatureUrl.set(url);
      },
      error: () => this.clearSignatureUrl(),
    });
  }

  updateProfile(payload: UpdateUserProfilePayload, onSuccess?: () => void): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.profileService
      .updateProfile(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          // Sincronizar nombre en AuthStore si se modificó
          const currentUser = this.authStore.user();
          if (currentUser && updated.professionalName !== currentUser.name) {
            this.authStore.updateUser({ name: updated.professionalName });
          }
          onSuccess?.();
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message || 'No se pudo actualizar el perfil.',
          );
        },
      });
  }

  uploadAvatar(file: File, onSuccess?: () => void): void {
    this.isUploadingAvatar.set(true);
    this.errorMessage.set(null);

    this.profileService
      .uploadAvatar(file)
      .pipe(finalize(() => this.isUploadingAvatar.set(false)))
      .subscribe({
        next: (meta) => {
          this.avatarMetadata.set(meta);
          this.loadAvatarBlob();
          onSuccess?.();
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message || 'No se pudo subir la foto de perfil.',
          );
        },
      });
  }

  removeAvatar(onSuccess?: () => void): void {
    this.isUploadingAvatar.set(true);
    this.errorMessage.set(null);

    this.profileService
      .removeAvatar()
      .pipe(finalize(() => this.isUploadingAvatar.set(false)))
      .subscribe({
        next: (meta) => {
          this.avatarMetadata.set(meta);
          this.clearAvatarUrl();
          onSuccess?.();
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message || 'No se pudo eliminar la foto de perfil.',
          );
        },
      });
  }

  uploadSignature(file: File, onSuccess?: () => void): void {
    this.isUploadingSignature.set(true);
    this.errorMessage.set(null);

    this.profileService
      .uploadSignature(file)
      .pipe(finalize(() => this.isUploadingSignature.set(false)))
      .subscribe({
        next: (meta) => {
          this.signatureMetadata.set(meta);
          this.loadSignatureBlob();
          onSuccess?.();
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message || 'No se pudo registrar la firma digital.',
          );
        },
      });
  }

  removeSignature(onSuccess?: () => void): void {
    this.isUploadingSignature.set(true);
    this.errorMessage.set(null);

    this.profileService
      .removeSignature()
      .pipe(finalize(() => this.isUploadingSignature.set(false)))
      .subscribe({
        next: (meta) => {
          this.signatureMetadata.set(meta);
          this.clearSignatureUrl();
          onSuccess?.();
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message || 'No se pudo eliminar la firma digital.',
          );
        },
      });
  }

  private clearAvatarUrl(): void {
    const current = this.avatarUrl();
    if (current && current.startsWith('blob:')) {
      URL.revokeObjectURL(current);
    }
    this.avatarUrl.set(null);
  }

  private clearSignatureUrl(): void {
    const current = this.signatureUrl();
    if (current && current.startsWith('blob:')) {
      URL.revokeObjectURL(current);
    }
    this.signatureUrl.set(null);
  }
}
