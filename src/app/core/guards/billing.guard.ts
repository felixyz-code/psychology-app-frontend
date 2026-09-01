import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TenantContextStore } from '../tenant-context/tenant-context.store';

export const billingGuard: CanActivateFn = () => {
  const store = inject(TenantContextStore);
  const router = inject(Router);

  const isActiveTenantReady = store.isActiveTenantReady();
  const isAdminSuspendedContext = store.isAdminSuspendedContext();

  if (!isActiveTenantReady && !isAdminSuspendedContext) {
    return false;
  }

  const snapshot = store.snapshot();
  const role = snapshot?.tenantContext?.organizationRole ?? snapshot?.membership?.role;

  const isBillingRole = role === 'OWNER' || role === 'BILLING';
  const hasBillingCapability =
    store.hasCapability('organization.manage') ||
    store.hasCapability('finance.manage') ||
    store.hasCapability('finance.summary_read');

  if (isBillingRole || hasBillingCapability) {
    return true;
  }

  return isActiveTenantReady ? router.createUrlTree(['/dashboard']) : false;
};
