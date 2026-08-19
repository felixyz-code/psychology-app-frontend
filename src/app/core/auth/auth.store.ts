import { computed, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { AuthUser } from './auth.models';

const AUTH_SESSION_KEY = 'psychology_app_auth_session';
const LEGACY_ACCESS_TOKEN_KEY = 'psychology_app_access_token';
const LEGACY_AUTH_USER_KEY = 'psychology_app_auth_user';

interface PersistedAuthSession {
  readonly accessToken: string;
  readonly user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly currentUserSignal = signal<AuthUser | null>(null);
  private readonly sessionVersionSignal = signal(0);
  private readonly sessionChangeSubject = new Subject<AuthUser | null>();

  readonly token = computed(() => this.accessTokenSignal());
  readonly user = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.accessTokenSignal());
  readonly sessionVersion = computed(() => this.sessionVersionSignal());
  readonly userRole = computed(() => this.currentUserSignal()?.role ?? null);
  readonly isAdmin = computed(() => this.userRole() === 'ADMIN');
  readonly isPsychologist = computed(() => this.userRole() === 'PSYCHOLOGIST');
  readonly sessionChanges = this.sessionChangeSubject.asObservable();

  constructor() {
    this.loadSessionFromStorage(true);

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.storageArea === localStorage && event.key === AUTH_SESSION_KEY) {
          this.loadSessionFromStorage(false);
        }
      });
    }
  }

  setSession(accessToken: string, user: AuthUser): void {
    this.accessTokenSignal.set(accessToken);
    this.currentUserSignal.set(user);
    this.sessionVersionSignal.update((version) => version + 1);

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ accessToken, user }));
    this.removeLegacyPersistedSession();
    this.sessionChangeSubject.next(user);
  }

  updateUser(updated: Partial<AuthUser>): void {
    const current = this.currentUserSignal();
    const token = this.accessTokenSignal();
    if (current && token) {
      const merged: AuthUser = { ...current, ...updated };
      this.currentUserSignal.set(merged);
      localStorage.setItem(
        AUTH_SESSION_KEY,
        JSON.stringify({ accessToken: token, user: merged }),
      );
      this.sessionChangeSubject.next(merged);
    }
  }

  clearSession(): void {
    const hadSession = this.accessTokenSignal() !== null || this.currentUserSignal() !== null;

    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);

    if (hadSession) {
      this.sessionVersionSignal.update((version) => version + 1);
    }

    this.removePersistedSession();

    if (hadSession) {
      this.sessionChangeSubject.next(null);
    }
  }

  private loadSessionFromStorage(isInitialLoad: boolean): void {
    const clearInvalidPersistedState = isInitialLoad;
    const rawSession = localStorage.getItem(AUTH_SESSION_KEY);

    if (rawSession !== null) {
      try {
        const persistedSession: unknown = JSON.parse(rawSession);

        if (this.isPersistedSession(persistedSession)) {
          this.applyRestoredSession(
            persistedSession.accessToken,
            persistedSession.user,
            !isInitialLoad,
          );
          return;
        }
      } catch {
        // Fall through to fail-closed handling below.
      }

      this.clearInMemorySession();
      if (clearInvalidPersistedState) {
        this.removePersistedSession(rawSession);
      }
      return;
    }

    if (!isInitialLoad) {
      this.clearInMemorySession();
      return;
    }

    const legacyAccessToken = localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
    const legacyRawUser = localStorage.getItem(LEGACY_AUTH_USER_KEY);

    if (legacyAccessToken?.trim() && legacyRawUser) {
      try {
        const legacyUser: unknown = JSON.parse(legacyRawUser);

        if (this.isStoredUser(legacyUser)) {
          this.applyRestoredSession(legacyAccessToken, legacyUser, false);
          if (clearInvalidPersistedState) {
            localStorage.setItem(
              AUTH_SESSION_KEY,
              JSON.stringify({ accessToken: legacyAccessToken, user: legacyUser }),
            );
            this.removeLegacyPersistedSession();
          }
          return;
        }
      } catch {
        // Fall through to fail-closed handling below.
      }
    }

    this.clearInMemorySession();
    if (clearInvalidPersistedState) {
      this.removeLegacyPersistedSession();
    }
  }

  private applyRestoredSession(
    accessToken: string,
    user: AuthUser,
    incrementVersion: boolean,
  ): void {
    const sessionChanged =
      this.accessTokenSignal() !== accessToken || this.currentUserSignal()?.id !== user.id;

    this.accessTokenSignal.set(accessToken);
    this.currentUserSignal.set(user);

    if (incrementVersion && sessionChanged) {
      this.sessionVersionSignal.update((version) => version + 1);
    }

    this.sessionChangeSubject.next(user);
  }

  private clearInMemorySession(): void {
    const hadSession = this.accessTokenSignal() !== null || this.currentUserSignal() !== null;

    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);

    if (hadSession) {
      this.sessionVersionSignal.update((version) => version + 1);
      this.sessionChangeSubject.next(null);
    }
  }

  private removePersistedSession(expectedCanonicalValue?: string | null): void {
    if (
      expectedCanonicalValue === undefined ||
      localStorage.getItem(AUTH_SESSION_KEY) === expectedCanonicalValue
    ) {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }

    this.removeLegacyPersistedSession();
  }

  private removeLegacyPersistedSession(): void {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_AUTH_USER_KEY);
  }

  private isPersistedSession(value: unknown): value is PersistedAuthSession {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<PersistedAuthSession>;
    return (
      typeof candidate.accessToken === 'string' &&
      candidate.accessToken.trim().length > 0 &&
      this.isStoredUser(candidate.user)
    );
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
