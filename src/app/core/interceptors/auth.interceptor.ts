import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

import { AuthStore } from '../auth/auth.store';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { TENANT_HTTP_MODE, TENANT_ORGANIZATION_ID } from '../tenant-context/tenant-http-context';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const mode = req.context.get(TENANT_HTTP_MODE);

  if (mode === 'PUBLIC') {
    return next(req);
  }

  const authStore = inject(AuthStore);
  const tenantContextStore = inject(TenantContextStore);
  const token = authStore.token();
  const organizationId =
    req.context.get(TENANT_ORGANIZATION_ID) ?? tenantContextStore.selectedOrganizationId();

  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  if ((mode === 'TENANT_OPTIONAL' || mode === 'TENANT_REQUIRED') && organizationId) {
    headers['X-Organization-Id'] = organizationId;
  }

  return next(Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req);
};
