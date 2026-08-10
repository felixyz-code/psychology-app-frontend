import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../auth/auth.service';
import { AuthStore } from '../auth/auth.store';
import { ThemeService } from '../theme/theme.service';
import { TenantContextStore } from '../tenant-context/tenant-context.store';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatToolbarModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  readonly tenantContextStore = inject(TenantContextStore);

  readonly authStore = inject(AuthStore);
  readonly isSidebarCollapsed = input(false);
  readonly isSidebarOpen = input(false);
  readonly menuToggle = output<void>();
  readonly isDarkTheme = this.themeService.isDarkTheme;
  readonly isSwitchingOrganization = signal(false);
  readonly organizationSwitchError = signal('');
  readonly canSwitchOrganization = computed(
    () =>
      Boolean(this.tenantContextStore.snapshot()?.organization) &&
      this.tenantContextStore.selectableMemberships().length > 1,
  );

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrador',
      PSYCHOLOGIST: 'Psicologo',
    };

    return labels[role] ?? role;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleTheme(enabled?: boolean, menuTrigger?: MatMenuTrigger): void {
    this.themeService.toggleDarkTheme(enabled ?? !this.isDarkTheme());
    menuTrigger?.closeMenu();
  }

  async switchOrganization(organizationId: string): Promise<void> {
    const currentOrganizationId = this.tenantContextStore.snapshot()?.organization?.id;
    if (
      this.isSwitchingOrganization() ||
      !organizationId ||
      organizationId === currentOrganizationId
    ) {
      return;
    }

    this.isSwitchingOrganization.set(true);
    this.organizationSwitchError.set('');

    try {
      await this.tenantContextStore.selectOrganization(organizationId);
      const contextReady =
        this.tenantContextStore.isActiveTenantReady() ||
        this.tenantContextStore.isAdminSuspendedContext();

      if (!contextReady || this.tenantContextStore.selectedOrganizationId() !== organizationId) {
        throw new Error('Canonical tenant selection did not complete');
      }

      if (!this.isDashboardRoute()) {
        const navigated = await this.router.navigate(['/dashboard'], { replaceUrl: true });
        if (!navigated && !this.isDashboardRoute()) {
          throw new Error('Dashboard navigation was rejected');
        }
      }
    } catch {
      this.organizationSwitchError.set(
        'No fue posible cambiar de organización. Selecciona tu organización nuevamente.',
      );
    } finally {
      this.isSwitchingOrganization.set(false);
    }
  }

  private isDashboardRoute(): boolean {
    return this.router.url.split(/[?#]/, 1)[0] === '/dashboard';
  }
}
