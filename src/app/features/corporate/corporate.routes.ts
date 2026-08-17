import { Routes } from '@angular/router';

export const corporateRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/corporate-dashboard.page').then((m) => m.CorporateDashboardPage),
  },
  {
    path: 'agreements/:id',
    loadComponent: () => import('./pages/agreement-detail.page').then((m) => m.AgreementDetailPage),
  },
];
