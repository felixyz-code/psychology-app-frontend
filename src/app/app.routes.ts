import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'patients',
        loadComponent: () =>
          import('./features/patients/pages/patients-list.page').then((m) => m.PatientsListPage),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/appointments/pages/appointments-list.page').then((m) => m.AppointmentsListPage),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'patients',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
