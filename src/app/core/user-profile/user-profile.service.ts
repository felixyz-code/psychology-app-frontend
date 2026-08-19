import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  UpdateUserProfilePayload,
  UserAssetMetadata,
  UserProfile,
} from './user-profile.models';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users/me`;

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/profile`);
  }

  updateProfile(payload: UpdateUserProfilePayload): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.baseUrl}/profile`, payload);
  }

  getAvatarMetadata(): Observable<UserAssetMetadata> {
    return this.http.get<UserAssetMetadata>(`${this.baseUrl}/avatar`);
  }

  getAvatarBlob(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/avatar/content`, {
      responseType: 'blob',
    });
  }

  uploadAvatar(file: File): Observable<UserAssetMetadata> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.put<UserAssetMetadata>(`${this.baseUrl}/avatar`, formData);
  }

  removeAvatar(): Observable<UserAssetMetadata> {
    return this.http.delete<UserAssetMetadata>(`${this.baseUrl}/avatar`);
  }

  getSignatureMetadata(): Observable<UserAssetMetadata> {
    return this.http.get<UserAssetMetadata>(`${this.baseUrl}/signature`);
  }

  getSignatureBlob(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/signature/content`, {
      responseType: 'blob',
    });
  }

  uploadSignature(file: File): Observable<UserAssetMetadata> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.put<UserAssetMetadata>(`${this.baseUrl}/signature`, formData);
  }

  removeSignature(): Observable<UserAssetMetadata> {
    return this.http.delete<UserAssetMetadata>(`${this.baseUrl}/signature`);
  }
}
