import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AuthService } from '../auth/auth.service';
import { AuthStore } from '../auth/auth.store';
import { ThemeService } from '../theme/theme.service';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { OrganizationConfigurationStore } from '../organization-configuration/organization-configuration.store';
import { OrganizationLogoStore } from '../organization-logo/organization-logo.store';
import { UserProfileStore } from '../user-profile/user-profile.store';
import { BranchSwitcherComponent } from '../../shared/components/branch-switcher/branch-switcher.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    BranchSwitcherComponent,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  readonly tenantContextStore = inject(TenantContextStore);
  readonly organizationConfigurationStore = inject(OrganizationConfigurationStore);
  readonly organizationLogoStore = inject(OrganizationLogoStore);
  readonly userProfileStore = inject(UserProfileStore);

  readonly authStore = inject(AuthStore);

  ngOnInit(): void {
    if (this.authStore.isAuthenticated() && !this.userProfileStore.profile()) {
      this.userProfileStore.loadProfile();
    }
  }
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

  readonly currentOrganizationDisplayName = computed(() => {
    const org = this.tenantContextStore.snapshot()?.organization as
      | { displayName?: string; tradeName?: string; name?: string }
      | undefined;
    const branding = this.organizationConfigurationStore.branding();
    return (
      org?.tradeName ||
      branding?.visualName ||
      org?.displayName ||
      org?.name ||
      'Organización'
    );
  });

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
