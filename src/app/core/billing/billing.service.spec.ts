import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';

import { environment } from '../../../environments/environment';
import {
  CheckoutSessionResponse,
  CreateCheckoutSessionPayload,
  CreatePortalSessionPayload,
  PortalSessionResponse,
  SubscriptionOverview,
} from './billing.models';
import { BillingService } from './billing.service';

describe('BillingService', () => {
  let service: BillingService;
  let httpMock: HttpTestingController;

  const mockSubscriptionOverview: SubscriptionOverview = {
    id: 'sub-123',
    organizationId: 'org-456',
    status: 'ACTIVE',
    stripeCustomerId: 'cus_test123',
    stripeSubscriptionId: 'sub_test123',
    stripePriceId: 'price_pro_monthly_mxn',
    cancelAtPeriodEnd: false,
    currentPeriodStart: '2026-08-01T00:00:00.000Z',
    currentPeriodEnd: '2026-08-31T23:59:59.999Z',
    plan: {
      id: 'plan-pro-id',
      tier: 'PRO',
      code: 'pro-monthly',
      name: 'Pro Plan',
      description: 'Plan profesional para clínicas',
      billingInterval: 'MONTHLY',
      basePrice: '999.00',
      currency: 'MXN',
      stripePriceId: 'price_pro_monthly_mxn',
    },
    quotas: {
      maxTherapists: 3,
      maxBranches: 2,
      maxNotificationsPerMonth: 500,
      maxPatients: 500,
      canCustomBrand: false,
      canTeleconsultation: true,
    },
    usage: {
      therapistsCount: 2,
      branchesCount: 1,
      notificationsCount: 120,
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-08-31T23:59:59.999Z',
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BillingService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(BillingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should retrieve subscription overview via GET /api/billing/subscription', () => {
    let result: SubscriptionOverview | undefined;

    service.getSubscriptionOverview().subscribe((res) => {
      result = res;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/billing/subscription`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSubscriptionOverview);

    expect(result).toEqual(mockSubscriptionOverview);
    expect(result?.plan.tier).toBe('PRO');
    expect(result?.usage.therapistsCount).toBe(2);
    expect(result?.quotas.maxTherapists).toBe(3);
  });

  it('should create checkout session via POST /api/billing/checkout-session', () => {
    const payload: CreateCheckoutSessionPayload = {
      priceId: 'price_clinic_monthly_mxn',
      successUrl: 'https://app.psicologia.com/billing?session_success=true',
      cancelUrl: 'https://app.psicologia.com/billing?session_canceled=true',
    };

    const mockResponse: CheckoutSessionResponse = {
      url: 'https://checkout.stripe.com/c/pay/cs_test_abc123',
      sessionId: 'cs_test_abc123',
    };

    let result: CheckoutSessionResponse | undefined;

    service.createCheckoutSession(payload).subscribe((res) => {
      result = res;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/billing/checkout-session`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);

    expect(result).toEqual(mockResponse);
    expect(result?.url).toContain('checkout.stripe.com');
  });

  it('should create customer portal session via POST /api/billing/portal-session', () => {
    const payload: CreatePortalSessionPayload = {
      returnUrl: 'https://app.psicologia.com/billing',
    };

    const mockResponse: PortalSessionResponse = {
      url: 'https://billing.stripe.com/p/session/portal_test_xyz',
    };

    let result: PortalSessionResponse | undefined;

    service.createPortalSession(payload).subscribe((res) => {
      result = res;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/billing/portal-session`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);

    expect(result).toEqual(mockResponse);
    expect(result?.url).toContain('billing.stripe.com');
  });

  it('should generate default URLs for redirectToCheckout', () => {
    const mockResponse: CheckoutSessionResponse = {
      url: 'https://checkout.stripe.com/test',
      sessionId: 'cs_123',
    };

    service.redirectToCheckout('price_pro_monthly_mxn').subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/billing/checkout-session`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.priceId).toBe('price_pro_monthly_mxn');
    expect(req.request.body.successUrl).toContain('/billing?session_success=true');
    expect(req.request.body.cancelUrl).toContain('/billing?session_canceled=true');
    req.flush(mockResponse);
  });

  it('should generate default URLs for redirectToPortal', () => {
    const mockResponse: PortalSessionResponse = {
      url: 'https://billing.stripe.com/portal',
    };

    service.redirectToPortal().subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/billing/portal-session`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.returnUrl).toContain('/billing');
    req.flush(mockResponse);
  });
});
