import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

export const superadminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated() && authStore.isAdmin()) {
    return true;
  }

  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return router.createUrlTree(['/dashboard']);
};
