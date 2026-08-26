import { Routes } from '@angular/router';

export const documentsRoutes: Routes = [
  {
    path: '',
    title: 'Documentos Clínicos | PsiqueOS',
    loadComponent: () =>
      import('./pages/documents-list-placeholder.page').then((m) => m.DocumentsListPlaceholderPage),
  },
  {
    path: ':id/edit',
    title: 'Editar Documento | PsiqueOS',
    loadComponent: () =>
      import('./pages/document-metadata-edit.page').then((m) => m.DocumentMetadataEditPage),
  },
  {
    path: 'new',
    title: 'Subir Documento | PsiqueOS',
    loadComponent: () => import('./pages/document-upload.page').then((m) => m.DocumentUploadPage),
  },
];
