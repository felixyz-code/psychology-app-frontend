import { Routes } from '@angular/router';

export const reportsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/reports-home.page').then((m) => m.ReportsHomePage),
  },
  {
    path: 'financial',
    loadComponent: () => import('./pages/report-runner.page').then((m) => m.ReportRunnerPage),
    data: {
      reportKey: 'financial',
    },
  },
  {
    path: 'agenda',
    loadComponent: () => import('./pages/report-runner.page').then((m) => m.ReportRunnerPage),
    data: {
      reportKey: 'agenda',
    },
  },
  {
    path: 'clinical-summary',
    loadComponent: () => import('./pages/report-runner.page').then((m) => m.ReportRunnerPage),
    data: {
      reportKey: 'clinical-summary',
    },
  },
  {
    path: 'clinical-record',
    loadComponent: () => import('./pages/report-runner.page').then((m) => m.ReportRunnerPage),
    data: {
      reportKey: 'clinical-record',
    },
  },
];
