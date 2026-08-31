import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthStore } from '../auth/auth.store';
import { TenantContextStore } from '../tenant-context/tenant-context.store';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly authStore = inject(AuthStore);
  readonly tenantContextStore = inject(TenantContextStore);
  readonly collapsed = input(false);
  readonly navSelected = output<void>();

  readonly canAccessBilling = computed(() => {
    if (!this.tenantContextStore.isActiveTenantReady()) {
      return false;
    }
    const snapshot = this.tenantContextStore.snapshot();
    const role = snapshot?.tenantContext?.organizationRole ?? snapshot?.membership?.role;
    return (
      role === 'OWNER' ||
      role === 'BILLING' ||
      this.tenantContextStore.hasCapability('organization.manage') ||
      this.tenantContextStore.hasCapability('finance.manage')
    );
  });
}
