import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '../auth/auth.store';
import { TenantContextStore } from '../tenant-context/tenant-context.store';

export const anonymousOnlyGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const tenantContextStore = inject(TenantContextStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return true;
  }

  if (tenantContextStore.isActiveTenantReady()) {
    return router.createUrlTree(['/dashboard']);
  }

  if (tenantContextStore.isAdminSuspendedContext()) {
    return router.createUrlTree(['/organization-administration']);
  }

  return router.createUrlTree(['/organization-selection']);
};
