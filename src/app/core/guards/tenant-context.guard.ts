import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TenantContextStore } from '../tenant-context/tenant-context.store';

export const tenantContextGuard: CanActivateFn = () => {
  const store = inject(TenantContextStore);
  const router = inject(Router);

  if (store.isActiveTenantReady() || store.isAdminSuspendedContext()) {
    return true;
  }

  if (store.state() === 'FORBIDDEN') {
    return router.createUrlTree(['/login']);
  }

  if (store.state() === 'AMBIGUOUS_SELECTION' || store.state() === 'NO_ACTIVE_TENANT') {
    return router.createUrlTree(['/organization-selection']);
  }

  return false;
};

export const activeTenantGuard: CanActivateFn = () => {
  const store = inject(TenantContextStore);
  const router = inject(Router);

  if (store.isCanonicalContextSynchronizationPending()) {
    return router.createUrlTree(['/organization-administration']);
  }

  if (store.isActiveTenantReady()) {
    return true;
  }

  if (store.isAdminSuspendedContext()) {
    return router.createUrlTree(['/organization-administration']);
  }

  return false;
};
