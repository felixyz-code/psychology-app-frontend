import { Routes } from '@angular/router';

export const superadminRoutes: Routes = [
  {
    path: '',
    title: 'SuperAdmin Backoffice | PsiqueOS',
    loadComponent: () =>
      import('./pages/tenants-backoffice.page').then((m) => m.TenantsBackofficePage),
  },
];
