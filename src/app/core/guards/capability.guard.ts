import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { TenantCapability } from '../tenant-context/tenant-context.models';

export const capabilityGuard: CanActivateFn = (route) => {
  const store = inject(TenantContextStore);
  const router = inject(Router);
  const capability = route.data?.['requiredCapability'] as TenantCapability | undefined;
  const isActiveTenantReady = store.isActiveTenantReady();
  const isAdminSuspendedContext = store.isAdminSuspendedContext();

  if (!capability || (!isActiveTenantReady && !isAdminSuspendedContext)) {
    return false;
  }

  if (store.hasCapability(capability)) {
    return true;
  }

  return isActiveTenantReady ? router.createUrlTree(['/dashboard']) : false;
};
