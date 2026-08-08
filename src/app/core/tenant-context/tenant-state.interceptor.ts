import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { filter, takeUntil } from 'rxjs';

import { TenantContextStore } from './tenant-context.store';
import { TENANT_HTTP_MODE, TENANT_ORGANIZATION_ID } from './tenant-http-context';

export const tenantStateInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(TENANT_HTTP_MODE) !== 'TENANT_REQUIRED') {
    return next(request);
  }

  const tenantContextStore = inject(TenantContextStore);
  const generation = tenantContextStore.switchGeneration();
  const organizationId =
    request.context.get(TENANT_ORGANIZATION_ID) ?? tenantContextStore.selectedOrganizationId();

  return next(request).pipe(
    takeUntil(
      tenantContextStore.invalidations.pipe(
        filter((invalidation) => invalidation.generation !== generation),
      ),
    ),
    filter(() => tenantContextStore.isRequestContextCurrent(generation, organizationId)),
  );
};
