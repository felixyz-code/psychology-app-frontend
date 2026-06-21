import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

import { AuthStore } from '../auth/auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.endsWith('/auth/login')) {
    return next(req);
  }

  const authStore = inject(AuthStore);
  const token = authStore.token();

  if (!token) {
    return next(req);
  }

  const authenticatedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authenticatedRequest);
};
