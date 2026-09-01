import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  COMMERCIAL_PLANS,
  CommercialPlanDefinition,
  PlanTier,
  SubscriptionOverview,
} from '../../../core/billing/billing.models';
import { BillingService } from '../../../core/billing/billing.service';

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './billing.page.html',
  styleUrl: './billing.page.scss',
})
export class BillingPageComponent implements OnInit {
  private readonly billingService = inject(BillingService);
  private readonly route = inject(ActivatedRoute);

  readonly subscription = signal<SubscriptionOverview | null>(null);
  readonly isLoading = signal(true);
  readonly isRedirecting = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly bannerMessage = signal<{
    type: 'success' | 'warning' | 'info';
    text: string;
  } | null>(null);

  readonly commercialPlans: CommercialPlanDefinition[] = COMMERCIAL_PLANS;

  ngOnInit(): void {
    this.handleQueryParams();
    this.loadSubscriptionOverview();
  }

  loadSubscriptionOverview(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.billingService.getSubscriptionOverview().subscribe({
      next: (data) => {
        this.subscription.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message ||
            'No fue posible cargar los detalles de facturación. Intenta de nuevo más tarde.',
        );
      },
    });
  }

  handleQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('session_success') === 'true' || params.get('success') === 'true') {
      this.bannerMessage.set({
        type: 'success',
        text: '¡Suscripción actualizada con éxito! Tus nuevas cuotas y capacidades ya están habilitadas.',
      });
    } else if (params.get('session_canceled') === 'true' || params.get('canceled') === 'true') {
      this.bannerMessage.set({
        type: 'warning',
        text: 'El proceso de pago o modificación de suscripción fue cancelado.',
      });
    }
  }

  dismissBanner(): void {
    this.bannerMessage.set(null);
  }

  openCustomerPortal(): void {
    if (this.isRedirecting()) return;
    this.isRedirecting.set('portal');

    this.billingService.redirectToPortal().subscribe({
      error: (err) => {
        this.isRedirecting.set(null);
        this.errorMessage.set(
          err?.error?.message ||
            'No se pudo abrir el portal de facturación en este momento.',
        );
      },
    });
  }

  selectPlan(plan: CommercialPlanDefinition): void {
    if (this.isRedirecting() || this.isCurrentPlan(plan)) return;

    if (plan.tier === 'ENTERPRISE') {
      const subject = encodeURIComponent('Solicitud de Plan Enterprise - PsiqueOS');
      const body = encodeURIComponent(
        'Hola equipo de PsiqueOS,\n\nNos interesa conocer más sobre el Plan Enterprise personalizado para nuestra institución.\n\nOrganización: ' +
          (this.subscription()?.organizationId ?? 'Mi Organización'),
      );
      if (typeof window !== 'undefined') {
        window.location.href = `mailto:ventas@psiqueos.com?subject=${subject}&body=${body}`;
      }
      return;
    }

    this.isRedirecting.set(plan.stripePriceId);

    this.billingService.redirectToCheckout(plan.stripePriceId).subscribe({
      error: (err) => {
        this.isRedirecting.set(null);
        this.errorMessage.set(
          err?.error?.message ||
            'No se pudo iniciar el proceso de suscripción para este plan.',
        );
      },
    });
  }

  isCurrentPlan(plan: CommercialPlanDefinition): boolean {
    const currentTier = this.subscription()?.plan.tier;
    return currentTier === plan.tier;
  }

  isUpgrade(plan: CommercialPlanDefinition): boolean {
    const currentTier = this.subscription()?.plan.tier;
    if (!currentTier) return true;

    const tierHierarchy: Record<PlanTier, number> = {
      FREE: 0,
      STARTER: 1,
      PRO: 2,
      CLINIC: 3,
      PROFESSIONAL: 3,
      ENTERPRISE: 4,
      CUSTOM: 4,
    };

    return (tierHierarchy[plan.tier] ?? 0) > (tierHierarchy[currentTier] ?? 0);
  }

  getUsagePercent(used: number, max: number): number {
    if (!max || max <= 0) return 0;
    const percent = Math.round((used / max) * 100);
    return Math.min(percent, 100);
  }

  getUsageStatusClass(used: number, max: number): 'usage-normal' | 'usage-warning' | 'usage-danger' {
    if (!max || max <= 0) return 'usage-normal';
    const ratio = used / max;
    if (ratio >= 1) return 'usage-danger';
    if (ratio >= 0.8) return 'usage-warning';
    return 'usage-normal';
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Activa';
      case 'TRIALING':
        return 'Período de Prueba';
      case 'PAST_DUE':
        return 'Pago Pendiente';
      case 'CANCELED':
        return 'Cancelada';
      case 'LIFETIME_SPONSOR':
        return 'Patrocinio Vitalicio';
      case 'FROZEN':
        return 'Congelada';
      default:
        return status || 'Sin suscripción';
    }
  }

  getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'LIFETIME_SPONSOR':
        return 'badge-active';
      case 'TRIALING':
        return 'badge-trial';
      case 'PAST_DUE':
        return 'badge-warning';
      case 'CANCELED':
      case 'FROZEN':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }
}
