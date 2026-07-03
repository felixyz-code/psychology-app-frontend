import { Routes } from '@angular/router';

export const caseFilesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/case-files-list.page').then((m) => m.CaseFilesListPage),
  },
];
