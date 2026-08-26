import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { anonymousOnlyGuard } from './core/guards/anonymous-only.guard';
import { capabilityGuard } from './core/guards/capability.guard';
import { activeTenantGuard, tenantContextGuard } from './core/guards/tenant-context.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar Sesión | PsiqueOS',
    loadComponent: () => import('./core/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'signup',
    title: 'Registro | PsiqueOS',
    canActivate: [anonymousOnlyGuard],
    loadComponent: () => import('./core/auth/signup.page').then((m) => m.SignupPage),
  },
  {
    path: 'forgot-password',
    title: 'Recuperar Contraseña | PsiqueOS',
    canActivate: [anonymousOnlyGuard],
    loadComponent: () =>
      import('./core/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'organization-selection',
    title: 'Seleccionar Organización | PsiqueOS',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/tenant-context/organization-selection.page').then(
        (m) => m.OrganizationSelectionPage,
      ),
  },
  {
    path: 'assessment-runner/:accessToken',
    title: 'Evaluación Psicométrica | PsiqueOS',
    loadComponent: () =>
      import('./features/assessments/pages/assessment-runner/assessment-runner.page').then(
        (m) => m.AssessmentRunnerPage,
      ),
  },
  {
    path: 'teleconsulta/:roomCode',
    title: 'Sala de Teleconsulta | PsiqueOS',
    loadComponent: () =>
      import('./features/teleconsultation/pages/teleconsultation-room-view.page').then(
        (m) => m.TeleconsultationRoomViewPage,
      ),
  },
  {
    path: 'teleconsulta',
    title: 'Sala de Teleconsulta | PsiqueOS',
    loadComponent: () =>
      import('./features/teleconsultation/pages/teleconsultation-room-view.page').then(
        (m) => m.TeleconsultationRoomViewPage,
      ),
  },
  {
    path: 'sandbox',
    title: 'Entorno de Pruebas (Sandbox) | PsiqueOS',
    loadComponent: () =>
      import('./features/sandbox/pages/sandbox.page').then((m) => m.SandboxPageComponent),
  },
  {
    path: 'demo',
    title: 'Demostración Interactiva | PsiqueOS',
    loadComponent: () =>
      import('./features/sandbox/pages/sandbox.page').then((m) => m.SandboxPageComponent),
  },
  {
    path: 'privacy',
    title: 'Aviso de Privacidad | PsiqueOS',
    loadComponent: () =>
      import('./features/legal/pages/privacy-policy.page').then((m) => m.PrivacyPolicyPage),
  },
  {
    path: 'terms',
    title: 'Términos de Servicio | PsiqueOS',
    loadComponent: () =>
      import('./features/legal/pages/terms-of-service.page').then((m) => m.TermsOfServicePage),
  },
  {
    path: 'compliance',
    title: 'Cumplimiento NOM-004 | PsiqueOS',
    loadComponent: () =>
      import('./features/legal/pages/compliance-normative.page').then(
        (m) => m.ComplianceNormativePage,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    title: 'PsiqueOS | Sistema Operativo para Salud Mental',
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
        title: 'Panel Principal | PsiqueOS',
        canActivate: [activeTenantGuard],
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'patients',
        title: 'Gestión de Pacientes | PsiqueOS',
        canActivate: [activeTenantGuard],
        loadComponent: () =>
          import('./features/patients/pages/patients-list.page').then((m) => m.PatientsListPage),
      },
      {
        path: 'pacientes',
        redirectTo: 'patients',
      },
      {
        path: 'appointments',
        title: 'Agenda de Citas | PsiqueOS',
        canActivate: [activeTenantGuard],
        loadComponent: () =>
          import('./features/appointments/pages/appointments-list.page').then(
            (m) => m.AppointmentsListPage,
          ),
      },
      {
        path: 'financial-transactions',
        title: 'Transacciones Financieras | PsiqueOS',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'finance.read' },
        loadChildren: () =>
          import('./features/financial-transactions/financial-transactions.routes').then(
            (m) => m.financialTransactionsRoutes,
          ),
      },
      {
        path: 'case-files',
        title: 'Expedientes Clínicos | PsiqueOS',
        canActivate: [activeTenantGuard],
        loadChildren: () =>
          import('./features/case-files/case-files.routes').then((m) => m.caseFilesRoutes),
      },
      {
        path: 'documents',
        title: 'Documentos Clínicos | PsiqueOS',
        canActivate: [activeTenantGuard],
        loadChildren: () =>
          import('./features/documents/documents.routes').then((m) => m.documentsRoutes),
      },
      {
        path: 'reports',
        title: 'Reportes & Analítica | PsiqueOS',
        canActivate: [activeTenantGuard],
        loadChildren: () =>
          import('./features/reports/reports.routes').then((m) => m.reportsRoutes),
      },
      {
        path: 'reportes',
        redirectTo: 'reports',
      },
      {
        path: 'organization-administration',
        title: 'Administración de Organización | PsiqueOS',
        canActivate: [capabilityGuard],
        data: { requiredCapability: 'organization.read' },
        loadChildren: () =>
          import('./features/organization-administration/organization-administration.routes').then(
            (m) => m.organizationAdministrationRoutes,
          ),
      },
      {
        path: 'branches',
        title: 'Gestión de Sucursales | PsiqueOS',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'organization.read' },
        loadChildren: () =>
          import('./features/branches/branches.routes').then((m) => m.branchesRoutes),
      },
      {
        path: 'corporate',
        title: 'Gestión Corporativa PAEF | PsiqueOS',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'organization.read' },
        loadChildren: () =>
          import('./features/corporate/corporate.routes').then((m) => m.corporateRoutes),
      },
      {
        path: 'membership-administration',
        title: 'Administración de Membresías | PsiqueOS',
        canActivate: [capabilityGuard],
        data: { requiredCapability: 'membership.read' },
        loadChildren: () =>
          import('./features/membership-administration/membership-administration.routes').then(
            (m) => m.membershipAdministrationRoutes,
          ),
      },
      {
        path: 'invitation-administration',
        title: 'Invitaciones | PsiqueOS',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'invitation.read' },
        loadChildren: () =>
          import('./features/invitation-administration/invitation-administration.routes').then(
            (m) => m.invitationAdministrationRoutes,
          ),
      },
      {
        path: 'management/assessments',
        title: 'Catálogo de Evaluaciones | PsiqueOS',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'assessment.template_manage' },
        loadChildren: () =>
          import('./features/assessments/assessment-management.routes').then(
            (m) => m.assessmentManagementRoutes,
          ),
      },
      {
        path: 'notification-templates',
        title: 'Plantillas de Notificación | PsiqueOS',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'notification_template.read' },
        loadChildren: () =>
          import('./features/notification-templates/notification-templates.routes').then(
            (m) => m.notificationTemplatesRoutes,
          ),
      },
      {
        path: 'audit-trail',
        title: 'Auditoría del Sistema | PsiqueOS',
        canActivate: [activeTenantGuard, capabilityGuard],
        data: { requiredCapability: 'audit.read' },
        loadChildren: () =>
          import('./features/audit-logs/audit-logs.routes').then((m) => m.auditLogsRoutes),
      },
      {
        path: 'profile',
        title: 'Mi Perfil | PsiqueOS',
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
