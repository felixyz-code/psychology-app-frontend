import { Routes } from '@angular/router';

export const membershipAdministrationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/membership-administration.page').then((m) => m.MembershipAdministrationPage),
  },
];
