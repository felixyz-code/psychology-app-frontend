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
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard.page').then((m) => m.DashboardPage),
      },
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
        path: 'financial-transactions',
        loadChildren: () =>
          import('./features/financial-transactions/financial-transactions.routes').then(
            (m) => m.financialTransactionsRoutes
          ),
      },
      {
        path: 'case-files',
        loadChildren: () => import('./features/case-files/case-files.routes').then((m) => m.caseFilesRoutes),
      },
      {
        path: 'documents',
        loadChildren: () => import('./features/documents/documents.routes').then((m) => m.documentsRoutes),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
