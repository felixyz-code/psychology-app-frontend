import { Routes } from '@angular/router';

export const notificationTemplatesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/notification-templates-list.page').then(
        (m) => m.NotificationTemplatesListPage,
      ),
  },
];
