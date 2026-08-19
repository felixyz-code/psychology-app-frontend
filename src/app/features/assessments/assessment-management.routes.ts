import { Routes } from '@angular/router';

export const assessmentManagementRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import(
        './pages/assessment-management-catalog/assessment-management-catalog.page'
      ).then((m) => m.AssessmentManagementCatalogPage),
  },
  {
    path: 'new',
    loadComponent: () =>
      import(
        './components/custom-instrument-builder/custom-instrument-builder.component'
      ).then((m) => m.CustomInstrumentBuilderComponent),
  },
  {
    path: ':id/builder',
    loadComponent: () =>
      import(
        './components/custom-instrument-builder/custom-instrument-builder.component'
      ).then((m) => m.CustomInstrumentBuilderComponent),
  },
];
