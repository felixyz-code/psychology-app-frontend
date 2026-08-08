import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, EMPTY, filter, from, mergeMap, takeUntil, throwError } from 'rxjs';

import { TenantContextStore } from './tenant-context.store';
import { TENANT_HTTP_MODE, TENANT_ORGANIZATION_ID } from './tenant-http-context';

export const tenantStateInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(TENANT_HTTP_MODE) !== 'TENANT_REQUIRED') {
    return next(request);
  }

  const tenantContextStore = inject(TenantContextStore);
  const generation = tenantContextStore.switchGeneration();
  const contextVersion = tenantContextStore.contextVersion();
  const organizationId =
    request.context.get(TENANT_ORGANIZATION_ID) ?? tenantContextStore.selectedOrganizationId();

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 403) {
        return throwError(() => error);
      }

      return from(
        tenantContextStore.revalidateOperationalContext(generation, organizationId, contextVersion),
      ).pipe(
        mergeMap(() =>
          tenantContextStore.isRequestContextCurrent(generation, organizationId)
            ? throwError(() => error)
            : EMPTY,
        ),
      );
    }),
    takeUntil(
      tenantContextStore.invalidations.pipe(
        filter((invalidation) => invalidation.generation !== generation),
      ),
    ),
    filter(() => tenantContextStore.isRequestContextCurrent(generation, organizationId)),
  );
};
