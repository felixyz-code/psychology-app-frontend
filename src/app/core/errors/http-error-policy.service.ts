import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '../auth/auth.store';
import { QuotaExceededDetails } from '../billing/billing.models';
import { QuotaPaywallDialogService } from '../billing/quota-paywall-dialog.service';

export type HttpErrorKind =
  | 'network'
  | 'unauthorized'
  | 'payment-required'
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

  if (status === 402) {
    return 'payment-required';
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
  private readonly quotaPaywallService = inject(QuotaPaywallDialogService);

  private isRedirectingToLogin = false;

  handle(error: HttpErrorResponse, requestUrl: string): HttpErrorKind {
    const kind = getHttpErrorKind(error.status);

    if (kind === 'unauthorized') {
      this.handleUnauthorizedRequest(requestUrl);
    } else if (
      kind === 'payment-required' ||
      error.error?.code === 'QUOTA_EXCEEDED' ||
      error.error?.error === 'QUOTA_EXCEEDED'
    ) {
      this.handleQuotaExceeded(error);
    }

    return kind;
  }

  private handleQuotaExceeded(error: HttpErrorResponse): void {
    const errorBody = error.error || {};
    const details: QuotaExceededDetails = {
      statusCode: error.status || 402,
      error: errorBody.error || 'QUOTA_EXCEEDED',
      code: errorBody.code || 'QUOTA_EXCEEDED',
      resource: errorBody.resource || 'OPERATIONAL_QUOTA',
      currentUsage: errorBody.currentUsage ?? 0,
      maxAllowed: errorBody.maxAllowed ?? 0,
      currentTier: errorBody.currentTier || '',
      suggestedTier: errorBody.suggestedTier || 'PRO',
      message: errorBody.message,
    };

    this.quotaPaywallService.openQuotaExceededDialog(details);
  }

  private handleUnauthorizedRequest(requestUrl: string): void {
    if (this.isPublicRequest(requestUrl) || !this.authStore.isAuthenticated()) {
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

  private isPublicRequest(requestUrl: string): boolean {
    const cleanUrl = requestUrl.split('?')[0];
    return (
      cleanUrl.endsWith('/auth/login') ||
      cleanUrl.includes('/teleconsultation/access') ||
      cleanUrl.includes('/assessments/public')
    );
  }
}
