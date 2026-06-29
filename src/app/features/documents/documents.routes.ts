import { Routes } from '@angular/router';

export const documentsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/documents-list-placeholder.page').then((m) => m.DocumentsListPlaceholderPage),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/document-metadata-edit.page').then((m) => m.DocumentMetadataEditPage),
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/document-upload.page').then((m) => m.DocumentUploadPage),
  },
];
