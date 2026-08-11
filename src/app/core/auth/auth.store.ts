import { computed, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { AuthUser } from './auth.models';

const ACCESS_TOKEN_KEY = 'psychology_app_access_token';
const AUTH_USER_KEY = 'psychology_app_auth_user';

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
    this.loadSessionFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.storageArea === localStorage && this.isAuthStorageKey(event.key)) {
          this.loadSessionFromStorage();
        }
      });
    }
  }

  setSession(accessToken: string, user: AuthUser): void {
    this.accessTokenSignal.set(accessToken);
    this.currentUserSignal.set(user);
    this.sessionVersionSignal.update((version) => version + 1);

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    this.sessionChangeSubject.next(user);
  }

  clearSession(): void {
    const hadSession = this.accessTokenSignal() !== null || this.currentUserSignal() !== null;

    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);

    if (hadSession) {
      this.sessionVersionSignal.update((version) => version + 1);
    }

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    if (hadSession) {
      this.sessionChangeSubject.next(null);
    }
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
      this.sessionChangeSubject.next(user);
    } catch {
      this.clearSession();
    }
  }

  private isAuthStorageKey(key: string | null): boolean {
    return key === ACCESS_TOKEN_KEY || key === AUTH_USER_KEY;
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
