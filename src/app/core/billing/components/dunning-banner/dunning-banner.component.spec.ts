import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubscriptionOverview } from '../../billing.models';
import { BillingService } from '../../billing.service';
import { TenantContextStore } from '../../../tenant-context/tenant-context.store';
import { DunningBannerComponent } from './dunning-banner.component';

describe('DunningBannerComponent', () => {
  let component: DunningBannerComponent;
  let fixture: ComponentFixture<DunningBannerComponent>;
  let billingServiceMock: {
    getSubscriptionOverview: ReturnType<typeof vi.fn>;
    redirectToPortal: ReturnType<typeof vi.fn>;
  };
  let tenantContextStoreMock: {
    isActiveTenantReady: ReturnType<typeof vi.fn>;
    invalidations: Subject<{ reason: string; generation: number }>;
  };
  let routerMock: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const createMockSubscription = (
    status: SubscriptionOverview['status'],
    gracePeriodEndsAt?: string | null,
    isGracePeriod?: boolean,
  ): SubscriptionOverview => ({
    id: 'sub-uuid-1',
    organizationId: 'org-uuid-1',
    status,
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    cancelAtPeriodEnd: false,
    currentPeriodStart: '2026-08-01T00:00:00Z',
    currentPeriodEnd: '2026-08-31T00:00:00Z',
    gracePeriodEndsAt: gracePeriodEndsAt ?? null,
    isGracePeriod: isGracePeriod ?? false,
    plan: {
      id: 'plan-1',
      tier: 'PRO',
      code: 'pro-monthly',
      name: 'Pro',
      billingInterval: 'MONTHLY',
      basePrice: '999',
      currency: 'MXN',
    },
    quotas: {
      maxTherapists: 3,
      maxBranches: 2,
      maxNotificationsPerMonth: 500,
      canCustomBrand: false,
      canTeleconsultation: true,
    },
    usage: {
      therapistsCount: 1,
      branchesCount: 1,
      notificationsCount: 10,
    },
  });

  beforeEach(async () => {
    billingServiceMock = {
      getSubscriptionOverview: vi.fn().mockReturnValue(of(createMockSubscription('ACTIVE'))),
      redirectToPortal: vi.fn().mockReturnValue(of({ url: 'https://billing.stripe.com/portal' })),
    };

    tenantContextStoreMock = {
      isActiveTenantReady: vi.fn().mockReturnValue(true),
      invalidations: new Subject(),
    };

    routerMock = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [DunningBannerComponent],
      providers: [
        { provide: BillingService, useValue: billingServiceMock },
        { provide: TenantContextStore, useValue: tenantContextStoreMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DunningBannerComponent);
    component = fixture.componentInstance;
  });

  it('initializes and does not display banner for ACTIVE status', () => {
    fixture.detectChanges();

    expect(component.bannerState()).toBe('NONE');
    const bannerEl = fixture.nativeElement.querySelector('.dunning-banner');
    expect(bannerEl).toBeNull();
  });

  it('displays WARNING_GRACE banner when subscription is PAST_DUE with active grace period', () => {
    const futureGrace = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    billingServiceMock.getSubscriptionOverview.mockReturnValue(
      of(createMockSubscription('PAST_DUE', futureGrace, true)),
    );

    fixture.detectChanges();

    expect(component.bannerState()).toBe('WARNING_GRACE');
    const bannerEl = fixture.nativeElement.querySelector('.dunning-banner--warning');
    expect(bannerEl).not.toBeNull();
    expect(bannerEl.textContent).toContain('Pago de suscripción pendiente');
    expect(bannerEl.textContent).toContain('Actualizar método de pago');
  });

  it('displays CRITICAL_BLOCKED banner when subscription is PAST_DUE and grace period has expired', () => {
    const pastGrace = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    billingServiceMock.getSubscriptionOverview.mockReturnValue(
      of(createMockSubscription('PAST_DUE', pastGrace, false)),
    );

    fixture.detectChanges();

    expect(component.bannerState()).toBe('CRITICAL_BLOCKED');
    const bannerEl = fixture.nativeElement.querySelector('.dunning-banner--danger');
    expect(bannerEl).not.toBeNull();
    expect(bannerEl.textContent).toContain('Modo de Solo Lectura Activo');
    expect(bannerEl.textContent).toContain('Reactivar Suscripción');
  });

  it('displays CRITICAL_BLOCKED banner when subscription status is CANCELED', () => {
    billingServiceMock.getSubscriptionOverview.mockReturnValue(
      of(createMockSubscription('CANCELED', null, false)),
    );

    fixture.detectChanges();

    expect(component.bannerState()).toBe('CRITICAL_BLOCKED');
    const bannerEl = fixture.nativeElement.querySelector('.dunning-banner--danger');
    expect(bannerEl).not.toBeNull();
  });

  it('dismisses warning banner when close button is clicked', () => {
    const futureGrace = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    billingServiceMock.getSubscriptionOverview.mockReturnValue(
      of(createMockSubscription('PAST_DUE', futureGrace, true)),
    );

    fixture.detectChanges();
    expect(component.bannerState()).toBe('WARNING_GRACE');

    component.dismiss();
    fixture.detectChanges();

    expect(component.bannerState()).toBe('NONE');
    const bannerEl = fixture.nativeElement.querySelector('.dunning-banner');
    expect(bannerEl).toBeNull();
  });

  it('triggers portal redirect on action click for warning banner', () => {
    const futureGrace = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    billingServiceMock.getSubscriptionOverview.mockReturnValue(
      of(createMockSubscription('PAST_DUE', futureGrace, true)),
    );

    fixture.detectChanges();
    component.handleAction();

    expect(billingServiceMock.redirectToPortal).toHaveBeenCalled();
  });

  it('navigates to /billing on action click for critical blocked banner', () => {
    billingServiceMock.getSubscriptionOverview.mockReturnValue(
      of(createMockSubscription('CANCELED', null, false)),
    );

    fixture.detectChanges();
    component.handleAction();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/billing']);
  });
});
