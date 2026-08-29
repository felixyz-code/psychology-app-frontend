import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { ACTIVE_BRANCH_STORAGE_KEY, BranchContextService } from '../services/branch-context.service';
import { TENANT_HTTP_MODE } from '../tenant-context/tenant-http-context';

export const branchContextInterceptor: HttpInterceptorFn = (req, next) => {
  const mode = req.context.get(TENANT_HTTP_MODE);

  if (mode === 'PUBLIC') {
    return next(req);
  }

  const branchContextService = inject(BranchContextService);
  let activeBranchId = branchContextService.currentBranchId();

  if (!activeBranchId) {
    try {
      const persisted = localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
      if (persisted && persisted !== 'ALL') {
        activeBranchId = persisted;
      }
    } catch {
      // Ignore
    }
  }

  if (activeBranchId && activeBranchId !== 'ALL' && !req.headers.has('x-branch-id')) {
    const cloned = req.clone({
      headers: req.headers.set('x-branch-id', activeBranchId),
    });
    return next(cloned);
  }

  return next(req);
};
