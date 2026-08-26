import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdjustQuotasDialogComponent } from '../components/adjust-quotas-dialog.component';
import { ExtendTrialDialogComponent } from '../components/extend-trial-dialog.component';
import { FreezeTenantDialogComponent } from '../components/freeze-tenant-dialog.component';
import { GrantLifetimeDialogComponent } from '../components/grant-lifetime-dialog.component';
import { AdminTenantItem, TenantSubscriptionStatus } from '../models/superadmin.models';
import { SuperadminTenantsService } from '../services/superadmin-tenants.service';

@Component({
  selector: 'app-tenants-backoffice-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './tenants-backoffice.page.html',
  styleUrl: './tenants-backoffice.page.scss',
})
export class TenantsBackofficePage implements OnInit {
  private readonly superadminService = inject(SuperadminTenantsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly tenants = signal<AdminTenantItem[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal('');
  readonly statusFilter = signal<string>('ALL');

  readonly displayedColumns: string[] = [
    'organization',
    'status',
    'sponsorship',
    'quotas',
    'expiration',
    'actions',
  ];

  readonly filteredTenants = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sf = this.statusFilter();

    return this.tenants().filter((t) => {
      const matchesSearch =
        !q ||
        t.displayName.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.legalName.toLowerCase().includes(q) ||
        (t.subscription?.sponsorNotes &&
          t.subscription.sponsorNotes.toLowerCase().includes(q));

      const subStatus = t.subscription?.status || 'NO_SUB';
      const matchesStatus =
        sf === 'ALL' ||
        (sf === 'LIFETIME' && subStatus === 'LIFETIME_SPONSOR') ||
        (sf === 'TRIAL' && subStatus === 'TRIALING') ||
        (sf === 'ACTIVE' && subStatus === 'ACTIVE') ||
        (sf === 'FROZEN' && (subStatus === 'FROZEN' || t.status === 'SUSPENDED'));

      return matchesSearch && matchesStatus;
    });
  });

  readonly stats = computed(() => {
    const all = this.tenants();
    const lifetime = all.filter(
      (t) => t.subscription?.status === 'LIFETIME_SPONSOR' || t.subscription?.isExempt,
    ).length;
    const trialing = all.filter((t) => t.subscription?.status === 'TRIALING').length;
    const active = all.filter((t) => t.subscription?.status === 'ACTIVE').length;
    const frozen = all.filter(
      (t) => t.subscription?.status === 'FROZEN' || t.status === 'SUSPENDED',
    ).length;

    return { total: all.length, lifetime, trialing, active, frozen };
  });

  ngOnInit(): void {
    this.loadTenants();
  }

  loadTenants(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.superadminService.listTenants().subscribe({
      next: (data) => {
        this.tenants.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Error al consultar la lista de organizaciones.',
        );
      },
    });
  }

  openExtendTrial(tenant: AdminTenantItem): void {
    const ref = this.dialog.open(ExtendTrialDialogComponent, {
      data: { tenant },
      width: '450px',
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.snackBar.open('Periodo de prueba extendido exitosamente.', 'Cerrar', {
          duration: 4000,
        });
        this.loadTenants();
      }
    });
  }

  openGrantLifetime(tenant: AdminTenantItem): void {
    const ref = this.dialog.open(GrantLifetimeDialogComponent, {
      data: { tenant },
      width: '560px',
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.snackBar.open('Membresía vitalicia otorgada correctamente.', 'Cerrar', {
          duration: 4000,
        });
        this.loadTenants();
      }
    });
  }

  openAdjustQuotas(tenant: AdminTenantItem): void {
    const ref = this.dialog.open(AdjustQuotasDialogComponent, {
      data: { tenant },
      width: '480px',
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.snackBar.open('Cuotas personalizadas actualizadas.', 'Cerrar', {
          duration: 4000,
        });
        this.loadTenants();
      }
    });
  }

  openFreezeTenant(tenant: AdminTenantItem): void {
    const isFrozen =
      tenant.subscription?.status === 'FROZEN' || tenant.status === 'SUSPENDED';

    const ref = this.dialog.open(FreezeTenantDialogComponent, {
      data: { tenant, isCurrentlyFrozen: isFrozen },
      width: '500px',
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        const msg = isFrozen
          ? 'Organización reactivada exitosamente.'
          : 'Organización congelada preventivamente.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        this.loadTenants();
      }
    });
  }

  getStatusClass(status?: TenantSubscriptionStatus): string {
    switch (status) {
      case 'LIFETIME_SPONSOR':
        return 'badge-lifetime';
      case 'TRIALING':
        return 'badge-trial';
      case 'ACTIVE':
        return 'badge-active';
      case 'FROZEN':
        return 'badge-frozen';
      case 'PAST_DUE':
        return 'badge-past-due';
      case 'EXPIRED':
      case 'CANCELED':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }

  getStatusLabel(status?: TenantSubscriptionStatus): string {
    switch (status) {
      case 'LIFETIME_SPONSOR':
        return 'Vitalicio (Aliado)';
      case 'TRIALING':
        return 'Periodo de Prueba';
      case 'ACTIVE':
        return 'Activa Comercial';
      case 'FROZEN':
        return 'Congelada';
      case 'PAST_DUE':
        return 'Pago Pendiente';
      case 'EXPIRED':
        return 'Expirada';
      case 'CANCELED':
        return 'Cancelada';
      default:
        return 'Sin Plan';
    }
  }

  formatLimit(val: number): string {
    return val === -1 ? '∞' : `${val}`;
  }
}
