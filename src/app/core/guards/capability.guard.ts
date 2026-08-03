import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { TenantCapability } from '../tenant-context/tenant-context.models';

export const capabilityGuard: CanActivateFn = (route) => {
  const store = inject(TenantContextStore);
  const capability = route.data?.['requiredCapability'] as TenantCapability | undefined;

  return Boolean(
    capability &&
      (store.isActiveTenantReady() || store.isAdminSuspendedContext()) &&
      store.hasCapability(capability),
  );
};
