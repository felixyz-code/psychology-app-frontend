import { Routes } from '@angular/router';

export const organizationAdministrationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/organization-administration.page').then(
        (m) => m.OrganizationAdministrationPage,
      ),
  },
];
