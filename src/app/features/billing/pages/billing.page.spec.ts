import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import {
  COMMERCIAL_PLANS,
  SubscriptionOverview,
} from '../../../core/billing/billing.models';
import { BillingService } from '../../../core/billing/billing.service';
import { BillingPageComponent } from './billing.page';

describe('BillingPageComponent', () => {
  let mockBillingService: {
    getSubscriptionOverview: ReturnType<typeof vi.fn>;
    redirectToCheckout: ReturnType<typeof vi.fn>;
    redirectToPortal: ReturnType<typeof vi.fn>;
  };

  const mockOverview: SubscriptionOverview = {
    id: 'sub-abc',
    organizationId: 'org-xyz',
    status: 'ACTIVE',
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    stripePriceId: 'price_pro_monthly_mxn',
    cancelAtPeriodEnd: false,
    currentPeriodStart: '2026-08-01T00:00:00.000Z',
    currentPeriodEnd: '2026-08-31T23:59:59.999Z',
    plan: {
      id: 'plan-pro',
      tier: 'PRO',
      code: 'pro-monthly',
      name: 'Pro',
      description: 'Plan profesional',
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
      notificationsCount: 250,
    },
  };

  beforeEach(() => {
    mockBillingService = {
      getSubscriptionOverview: vi.fn().mockReturnValue(of(mockOverview)),
      redirectToCheckout: vi.fn().mockReturnValue(of({ url: 'https://checkout.stripe.com/test', sessionId: 'cs_123' })),
      redirectToPortal: vi.fn().mockReturnValue(of({ url: 'https://billing.stripe.com/portal' })),
    };

    TestBed.configureTestingModule({
      imports: [BillingPageComponent],
      providers: [
        { provide: BillingService, useValue: mockBillingService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    });
  });

  it('should load subscription overview on init and update signals', () => {
    const fixture = TestBed.createComponent(BillingPageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(mockBillingService.getSubscriptionOverview).toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
    expect(component.subscription()).toEqual(mockOverview);
    expect(component.errorMessage()).toBeNull();
  });

  it('should calculate gauge percentage and status classes correctly', () => {
    const fixture = TestBed.createComponent(BillingPageComponent);
    const component = fixture.componentInstance;

    expect(component.getUsagePercent(2, 3)).toBe(67);
    expect(component.getUsagePercent(3, 3)).toBe(100);
    expect(component.getUsagePercent(0, 0)).toBe(0);

    expect(component.getUsageStatusClass(1, 3)).toBe('usage-normal');
    expect(component.getUsageStatusClass(2.5, 3)).toBe('usage-warning');
    expect(component.getUsageStatusClass(3, 3)).toBe('usage-danger');
  });

  it('should identify current plan correctly in catalog', () => {
    const fixture = TestBed.createComponent(BillingPageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    const proPlan = COMMERCIAL_PLANS.find((p) => p.tier === 'PRO')!;
    const starterPlan = COMMERCIAL_PLANS.find((p) => p.tier === 'STARTER')!;
    const clinicPlan = COMMERCIAL_PLANS.find((p) => p.tier === 'CLINIC')!;

    expect(component.isCurrentPlan(proPlan)).toBe(true);
    expect(component.isCurrentPlan(starterPlan)).toBe(false);
    expect(component.isUpgrade(clinicPlan)).toBe(true);
    expect(component.isUpgrade(starterPlan)).toBe(false);
  });

  it('should call redirectToCheckout when selecting an upgrade plan', () => {
    const fixture = TestBed.createComponent(BillingPageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    const clinicPlan = COMMERCIAL_PLANS.find((p) => p.tier === 'CLINIC')!;
    component.selectPlan(clinicPlan);

    expect(mockBillingService.redirectToCheckout).toHaveBeenCalledWith(clinicPlan.stripePriceId);
  });

  it('should call redirectToPortal when openCustomerPortal is clicked', () => {
    const fixture = TestBed.createComponent(BillingPageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    component.openCustomerPortal();

    expect(mockBillingService.redirectToPortal).toHaveBeenCalled();
  });

  it('should show success banner when session_success query param is present', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BillingPageComponent],
      providers: [
        { provide: BillingService, useValue: mockBillingService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ session_success: 'true' }),
            },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(BillingPageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.bannerMessage()?.type).toBe('success');
  });

  it('should show warning banner when session_canceled query param is present', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BillingPageComponent],
      providers: [
        { provide: BillingService, useValue: mockBillingService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ session_canceled: 'true' }),
            },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(BillingPageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.bannerMessage()?.type).toBe('warning');
  });

  it('should handle error when loading subscription overview fails', () => {
    mockBillingService.getSubscriptionOverview.mockReturnValue(
      throwError(() => ({ error: { message: 'Fallo de conexión' } })),
    );

    const fixture = TestBed.createComponent(BillingPageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Fallo de conexión');
  });
});
