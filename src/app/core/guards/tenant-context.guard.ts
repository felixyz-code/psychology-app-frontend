import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TenantContextStore } from '../tenant-context/tenant-context.store';

export const tenantContextGuard: CanActivateFn = () => {
  const store = inject(TenantContextStore);
  const router = inject(Router);

  if (store.isActiveTenantReady()) {
    return true;
  }

  if (store.state() === 'FORBIDDEN') {
    return router.createUrlTree(['/login']);
  }

  return false;
};
