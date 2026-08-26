import { Routes } from '@angular/router';

export const reportsRoutes: Routes = [
  {
    path: '',
    title: 'Reportes & Analítica | PsiqueOS',
    loadComponent: () => import('./pages/reports-home.page').then((m) => m.ReportsHomePage),
  },
  {
    path: 'financial',
    title: 'Reporte Financiero | PsiqueOS',
    loadComponent: () => import('./pages/report-runner.page').then((m) => m.ReportRunnerPage),
    data: {
      reportKey: 'financial',
    },
  },
  {
    path: 'agenda',
    title: 'Reporte de Agenda | PsiqueOS',
    loadComponent: () => import('./pages/report-runner.page').then((m) => m.ReportRunnerPage),
    data: {
      reportKey: 'agenda',
    },
  },
  {
    path: 'clinical-summary',
    title: 'Resumen Clínico | PsiqueOS',
    loadComponent: () => import('./pages/report-runner.page').then((m) => m.ReportRunnerPage),
    data: {
      reportKey: 'clinical-summary',
    },
  },
  {
    path: 'clinical-record',
    title: 'Expediente Clínico | PsiqueOS',
    loadComponent: () => import('./pages/report-runner.page').then((m) => m.ReportRunnerPage),
    data: {
      reportKey: 'clinical-record',
    },
  },
];
