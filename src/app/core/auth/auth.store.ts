import { computed, Injectable, signal } from '@angular/core';

import { AuthUser } from './auth.models';

const ACCESS_TOKEN_KEY = 'psychology_app_access_token';
const AUTH_USER_KEY = 'psychology_app_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly currentUserSignal = signal<AuthUser | null>(null);

  readonly token = computed(() => this.accessTokenSignal());
  readonly user = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.accessTokenSignal());
  readonly userRole = computed(() => this.currentUserSignal()?.role ?? null);
  readonly isAdmin = computed(() => this.userRole() === 'ADMIN');
  readonly isPsychologist = computed(() => this.userRole() === 'PSYCHOLOGIST');

  constructor() {
    this.loadSessionFromStorage();
  }

  setSession(accessToken: string, user: AuthUser): void {
    this.accessTokenSignal.set(accessToken);
    this.currentUserSignal.set(user);

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  clearSession(): void {
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }

  private loadSessionFromStorage(): void {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const rawUser = localStorage.getItem(AUTH_USER_KEY);

    if (!accessToken?.trim() || !rawUser) {
      this.clearSession();
      return;
    }

    try {
      const user: unknown = JSON.parse(rawUser);

      if (!this.isStoredUser(user)) {
        this.clearSession();
        return;
      }

      this.accessTokenSignal.set(accessToken);
      this.currentUserSignal.set(user);
    } catch {
      this.clearSession();
    }
  }

  private isStoredUser(user: unknown): user is AuthUser {
    if (!user || typeof user !== 'object') {
      return false;
    }

    const candidate = user as Partial<AuthUser>;

    return (
      typeof candidate.id === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.email === 'string' &&
      (candidate.role === 'ADMIN' || candidate.role === 'PSYCHOLOGIST')
    );
  }
}
