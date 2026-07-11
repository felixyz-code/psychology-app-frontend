import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '../auth/auth.store';

export type HttpErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'rate-limited'
  | 'server'
  | 'other';

export function getHttpErrorKind(status: number): HttpErrorKind {
  if (status === 0) {
    return 'network';
  }

  if (status === 401) {
    return 'unauthorized';
  }

  if (status === 403) {
    return 'forbidden';
  }

  if (status === 404) {
    return 'not-found';
  }

  if (status === 429) {
    return 'rate-limited';
  }

  if (status >= 500) {
    return 'server';
  }

  return 'other';
}

@Injectable({ providedIn: 'root' })
export class HttpErrorPolicyService {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  private isRedirectingToLogin = false;

  handle(error: HttpErrorResponse, requestUrl: string): HttpErrorKind {
    const kind = getHttpErrorKind(error.status);

    if (kind === 'unauthorized') {
      this.handleUnauthorizedRequest(requestUrl);
    }

    return kind;
  }

  private handleUnauthorizedRequest(requestUrl: string): void {
    if (this.isLoginRequest(requestUrl) || !this.authStore.isAuthenticated()) {
      return;
    }

    this.authStore.clearSession();

    if (this.router.url.startsWith('/login') || this.isRedirectingToLogin) {
      return;
    }

    this.isRedirectingToLogin = true;

    void this.router.navigate(['/login']).finally(() => {
      this.isRedirectingToLogin = false;
    });
  }

  private isLoginRequest(requestUrl: string): boolean {
    return requestUrl.split('?')[0].endsWith('/auth/login');
  }
}
