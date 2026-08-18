import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { BranchContextService } from '../services/branch-context.service';
import { TENANT_HTTP_MODE } from '../tenant-context/tenant-http-context';

export const branchContextInterceptor: HttpInterceptorFn = (req, next) => {
  const mode = req.context.get(TENANT_HTTP_MODE);

  if (mode === 'PUBLIC') {
    return next(req);
  }

  const branchContextService = inject(BranchContextService);
  const activeBranchId = branchContextService.currentBranchId();

  if (activeBranchId && !req.headers.has('x-branch-id')) {
    const cloned = req.clone({
      setHeaders: {
        'x-branch-id': activeBranchId,
      },
    });
    return next(cloned);
  }

  return next(req);
};
