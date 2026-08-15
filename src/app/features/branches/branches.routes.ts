import { Routes } from '@angular/router';

export const branchesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/branches-list.page').then((m) => m.BranchesListPage),
  },
];
