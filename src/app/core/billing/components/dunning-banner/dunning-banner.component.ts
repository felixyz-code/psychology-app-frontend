import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SubscriptionOverview } from '../../billing.models';
import { BillingService } from '../../billing.service';
import { TenantContextStore } from '../../../tenant-context/tenant-context.store';

export type DunningBannerState = 'NONE' | 'WARNING_GRACE' | 'CRITICAL_BLOCKED';

@Component({
  selector: 'app-dunning-banner',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './dunning-banner.component.html',
  styleUrl: './dunning-banner.component.scss',
})
export class DunningBannerComponent implements OnInit {
  private readonly billingService = inject(BillingService);
  private readonly tenantContextStore = inject(TenantContextStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly subscription = signal<SubscriptionOverview | null>(null);
  readonly isLoading = signal(false);
  readonly isRedirecting = signal(false);
  readonly isDismissed = signal(false);

  readonly bannerState = computed<DunningBannerState>(() => {
    if (this.isDismissed()) return 'NONE';

    const sub = this.subscription();
    if (!sub) return 'NONE';

    const status = sub.status;

    if (status === 'PAST_DUE') {
      const now = new Date();
      const hasActiveGrace =
        sub.isGracePeriod ||
        (sub.gracePeriodEndsAt !== null &&
          sub.gracePeriodEndsAt !== undefined &&
          new Date(sub.gracePeriodEndsAt) > now);

      return hasActiveGrace ? 'WARNING_GRACE' : 'CRITICAL_BLOCKED';
    }

    if (
      status === 'CANCELED' ||
      status === 'UNPAID' ||
      status === 'EXPIRED' ||
      status === 'FROZEN'
    ) {
      return 'CRITICAL_BLOCKED';
    }

    return 'NONE';
  });

  readonly formattedGraceDate = computed<string>(() => {
    const sub = this.subscription();
    if (!sub?.gracePeriodEndsAt) return '';
    try {
      const date = new Date(sub.gracePeriodEndsAt);
      return new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch {
      return '';
    }
  });

  readonly daysRemaining = computed<number | null>(() => {
    const sub = this.subscription();
    if (!sub?.gracePeriodEndsAt) return null;
    const now = new Date().getTime();
    const target = new Date(sub.gracePeriodEndsAt).getTime();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  });

  ngOnInit(): void {
    if (this.tenantContextStore.isActiveTenantReady()) {
      this.loadSubscription();
    }

    this.tenantContextStore.invalidations
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isDismissed.set(false);
        if (this.tenantContextStore.isActiveTenantReady()) {
          this.loadSubscription();
        } else {
          this.subscription.set(null);
        }
      });
  }

  loadSubscription(): void {
    this.isLoading.set(true);
    this.billingService.getSubscriptionOverview().subscribe({
      next: (data) => {
        this.subscription.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  handleAction(): void {
    const sub = this.subscription();

    if (sub?.stripeCustomerId && this.bannerState() === 'WARNING_GRACE') {
      this.isRedirecting.set(true);
      this.billingService.redirectToPortal().subscribe({
        error: () => {
          this.isRedirecting.set(false);
          void this.router.navigate(['/billing']);
        },
      });
    } else {
      void this.router.navigate(['/billing']);
    }
  }

  dismiss(): void {
    this.isDismissed.set(true);
  }
}
