import { Routes } from '@angular/router';

export const caseFilesRoutes: Routes = [
  {
    path: '',
    title: 'Expedientes Clínicos | PsiqueOS',
    loadComponent: () => import('./pages/case-files-list.page').then((m) => m.CaseFilesListPage),
  },
];
