import { Routes } from '@angular/router';
export const invitationAdministrationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/invitation-administration.page').then((m) => m.InvitationAdministrationPage),
  },
];
