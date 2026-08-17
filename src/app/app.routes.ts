import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { anonymousOnlyGuard } from './core/guards/anonymous-only.guard';
import { capabilityGuard } from './core/guards/capability.guard';
import { activeTenantGuard, tenantContextGuard } from './core/guards/tenant-context.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./core/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'signup',
    canActivate: [anonymousOnlyGuard],
    loadComponent: () => import('./core/auth/signup.page').then((m) => m.SignupPage),
  },
  {
    path: 'organization-selection',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/tenant-context/organization-selection.page').then(
        (m) => m.OrganizationSelectionPage,
      ),
  },
  {
    path: '',
    canActivate: [authGuard, tenantContextGuard],
    loadComponent: () =>
      import('./core/layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        canActivate: [activeTenantGuard],
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'patients',
        canActivate: [activeTenantGuard],
        loadComponent: () =>
          import('./features/patients/pages/patients-list.page').then((m) => m.PatientsListPage),
      },
      {
        path: 'appointments',
        canActivate: [activeTenantGuard],
        loadComponent: () =>
          import('./features/appointments/pages/appointments-list.page').then(
            (m) => m.AppointmentsListPage,
          ),
      },
      {
        path: 'financial-transactions',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'finance.read' },
        loadChildren: () =>
          import('./features/financial-transactions/financial-transactions.routes').then(
            (m) => m.financialTransactionsRoutes,
          ),
      },
      {
        path: 'case-files',
        canActivate: [activeTenantGuard],
        loadChildren: () =>
          import('./features/case-files/case-files.routes').then((m) => m.caseFilesRoutes),
      },
      {
        path: 'documents',
        canActivate: [activeTenantGuard],
        loadChildren: () =>
          import('./features/documents/documents.routes').then((m) => m.documentsRoutes),
      },
      {
        path: 'reports',
        canActivate: [activeTenantGuard],
        loadChildren: () =>
          import('./features/reports/reports.routes').then((m) => m.reportsRoutes),
      },
      {
        path: 'organization-administration',
        canActivate: [capabilityGuard],
        data: { requiredCapability: 'organization.read' },
        loadChildren: () =>
          import('./features/organization-administration/organization-administration.routes').then(
            (m) => m.organizationAdministrationRoutes,
          ),
      },
      {
        path: 'branches',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'organization.read' },
        loadChildren: () =>
          import('./features/branches/branches.routes').then((m) => m.branchesRoutes),
      },
      {
        path: 'corporate',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'organization.read' },
        loadChildren: () =>
          import('./features/corporate/corporate.routes').then((m) => m.corporateRoutes),
      },
      {
        path: 'membership-administration',
        canActivate: [capabilityGuard],
        data: { requiredCapability: 'membership.read' },
        loadChildren: () =>
          import('./features/membership-administration/membership-administration.routes').then(
            (m) => m.membershipAdministrationRoutes,
          ),
      },
      {
        path: 'invitation-administration',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'invitation.read' },
        loadChildren: () =>
          import('./features/invitation-administration/invitation-administration.routes').then(
            (m) => m.invitationAdministrationRoutes,
          ),
      },
      {
        path: 'audit-trail',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'audit.read' },
        loadChildren: () =>
          import('./features/audit-logs/audit-logs.routes').then((m) => m.auditLogsRoutes),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
