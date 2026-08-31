import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CheckoutSessionResponse,
  CreateCheckoutSessionPayload,
  CreatePortalSessionPayload,
  PortalSessionResponse,
  SubscriptionOverview,
} from './billing.models';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/billing`;

  getSubscriptionOverview(): Observable<SubscriptionOverview> {
    return this.http.get<SubscriptionOverview>(`${this.basePath}/subscription`);
  }

  createCheckoutSession(
    payload: CreateCheckoutSessionPayload,
  ): Observable<CheckoutSessionResponse> {
    return this.http.post<CheckoutSessionResponse>(
      `${this.basePath}/checkout-session`,
      payload,
    );
  }

  createPortalSession(
    payload: CreatePortalSessionPayload = {},
  ): Observable<PortalSessionResponse> {
    return this.http.post<PortalSessionResponse>(
      `${this.basePath}/portal-session`,
      payload,
    );
  }

  redirectToCheckout(
    priceId: string,
    successUrl?: string,
    cancelUrl?: string,
  ): Observable<CheckoutSessionResponse> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const resolvedSuccessUrl =
      successUrl ?? `${origin}/billing?session_success=true`;
    const resolvedCancelUrl =
      cancelUrl ?? `${origin}/billing?session_canceled=true`;

    return this.createCheckoutSession({
      priceId,
      successUrl: resolvedSuccessUrl,
      cancelUrl: resolvedCancelUrl,
    }).pipe(
      tap((response) => {
        if (response.url && typeof window !== 'undefined') {
          window.location.href = response.url;
        }
      }),
    );
  }

  redirectToPortal(returnUrl?: string): Observable<PortalSessionResponse> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const resolvedReturnUrl = returnUrl ?? `${origin}/billing`;

    return this.createPortalSession({
      returnUrl: resolvedReturnUrl,
    }).pipe(
      tap((response) => {
        if (response.url && typeof window !== 'undefined') {
          window.location.href = response.url;
        }
      }),
    );
  }
}
