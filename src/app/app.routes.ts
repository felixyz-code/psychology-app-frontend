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
    path: 'forgot-password',
    canActivate: [anonymousOnlyGuard],
    loadComponent: () =>
      import('./core/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
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
    path: 'assessment-runner/:accessToken',
    loadComponent: () =>
      import('./features/assessments/pages/assessment-runner/assessment-runner.page').then(
        (m) => m.AssessmentRunnerPage,
      ),
  },
  {
    path: 'teleconsulta/:roomCode',
    loadComponent: () =>
      import('./features/teleconsultation/pages/teleconsultation-room-view.page').then(
        (m) => m.TeleconsultationRoomViewPage,
      ),
  },
  {
    path: 'teleconsulta',
    loadComponent: () =>
      import('./features/teleconsultation/pages/teleconsultation-room-view.page').then(
        (m) => m.TeleconsultationRoomViewPage,
      ),
  },
  {
    path: 'sandbox',
    loadComponent: () =>
      import('./features/sandbox/pages/sandbox.page').then((m) => m.SandboxPageComponent),
  },
  {
    path: 'demo',
    loadComponent: () =>
      import('./features/sandbox/pages/sandbox.page').then((m) => m.SandboxPageComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [anonymousOnlyGuard],
    loadComponent: () =>
      import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent),
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
        path: 'management/assessments',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'assessment.template_manage' },
        loadChildren: () =>
          import('./features/assessments/assessment-management.routes').then(
            (m) => m.assessmentManagementRoutes,
          ),
      },
      {
        path: 'notification-templates',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'notification_template.read' },
        loadChildren: () =>
          import('./features/notification-templates/notification-templates.routes').then(
            (m) => m.notificationTemplatesRoutes,
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
        path: 'profile',
        loadComponent: () =>
          import('./features/user-profile/pages/user-profile.page').then(
            (m) => m.UserProfilePage,
          ),
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
