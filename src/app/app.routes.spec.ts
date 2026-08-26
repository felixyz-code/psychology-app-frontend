import { authGuard } from './core/guards/auth.guard';
import { anonymousOnlyGuard } from './core/guards/anonymous-only.guard';
import { capabilityGuard } from './core/guards/capability.guard';
import { superadminGuard } from './core/guards/superadmin.guard';
import { activeTenantGuard, tenantContextGuard } from './core/guards/tenant-context.guard';
import { routes } from './app.routes';

describe('app routes', () => {
  it('exposes the public commercial landing page at the root route for anonymous visitors', () => {
    const landingRoute = routes.find((route) => route.path === '' && route.pathMatch === 'full');

    expect(landingRoute).toBeDefined();
    expect(landingRoute?.canActivate).toEqual([anonymousOnlyGuard]);
    expect(landingRoute?.loadComponent).toBeDefined();
  });

  it('keeps login as the public route outside the protected shell', () => {
    const loginRoute = routes.find((route) => route.path === 'login');

    expect(loginRoute?.canActivate).toBeUndefined();
    expect(loginRoute?.loadComponent).toBeDefined();
  });

  it('exposes public teleconsultation routes outside the protected shell without auth guard', () => {
    const paramRoute = routes.find((route) => route.path === 'teleconsulta/:roomCode');
    const directRoute = routes.find((route) => route.path === 'teleconsulta');

    expect(paramRoute?.canActivate).toBeUndefined();
    expect(paramRoute?.loadComponent).toBeDefined();
    expect(directRoute?.canActivate).toBeUndefined();
    expect(directRoute?.loadComponent).toBeDefined();
  });

  it('exposes public interactive sandbox and demo routes without auth guard', () => {
    const sandboxRoute = routes.find((route) => route.path === 'sandbox');
    const demoRoute = routes.find((route) => route.path === 'demo');

    expect(sandboxRoute?.canActivate).toBeUndefined();
    expect(sandboxRoute?.loadComponent).toBeDefined();
    expect(demoRoute?.canActivate).toBeUndefined();
    expect(demoRoute?.loadComponent).toBeDefined();
  });

  it('exposes public legal pages (privacy, terms, compliance) without auth guard', () => {
    const privacyRoute = routes.find((route) => route.path === 'privacy');
    const termsRoute = routes.find((route) => route.path === 'terms');
    const complianceRoute = routes.find((route) => route.path === 'compliance');

    expect(privacyRoute?.canActivate).toBeUndefined();
    expect(privacyRoute?.loadComponent).toBeDefined();
    expect(termsRoute?.canActivate).toBeUndefined();
    expect(termsRoute?.loadComponent).toBeDefined();
    expect(complianceRoute?.canActivate).toBeUndefined();
    expect(complianceRoute?.loadComponent).toBeDefined();
  });

  it('exposes signup to anonymous users through the narrowly scoped anonymous-only policy', () => {
    const signupRoute = routes.find((route) => route.path === 'signup');

    expect(signupRoute?.canActivate).toEqual([anonymousOnlyGuard]);
    expect(signupRoute?.loadComponent).toBeDefined();
  });

  it('exposes forgot-password to anonymous users through the anonymous-only policy', () => {
    const forgotPasswordRoute = routes.find((route) => route.path === 'forgot-password');

    expect(forgotPasswordRoute?.canActivate).toEqual([anonymousOnlyGuard]);
    expect(forgotPasswordRoute?.loadComponent).toBeDefined();
  });

  it('exposes organization selection behind authentication but outside tenant resolution', () => {
    const selectionRoute = routes.find((route) => route.path === 'organization-selection');

    expect(selectionRoute?.canActivate).toEqual([authGuard]);
    expect(selectionRoute?.loadComponent).toBeDefined();
  });

  it('keeps the root shell protected by the real auth guard', () => {
    const shellRoute = routes.find((route) => route.path === '' && route.children !== undefined);

    expect(shellRoute?.canActivate).toEqual([authGuard, tenantContextGuard]);
    expect(shellRoute?.loadComponent).toBeDefined();
    expect(
      shellRoute?.children?.some((route) => route.path === 'dashboard' && route.loadComponent),
    ).toBe(true);
  });

  it('keeps critical redirects and lazy feature children stable', () => {
    const shellRoute = routes.find((route) => route.path === '' && route.children !== undefined);
    const childRoutes = shellRoute?.children ?? [];

    expect(childRoutes.find((route) => route.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'dashboard',
    });
    expect(routes.find((route) => route.path === '**')).toMatchObject({
      path: '**',
      redirectTo: '',
    });
    expect(routes.find((route) => route.path === 'login')?.loadComponent).toBeDefined();
    expect(
      routes.find((route) => route.path === 'organization-selection')?.loadComponent,
    ).toBeDefined();
    expect(
      childRoutes.some((route) => route.path === 'financial-transactions' && route.loadChildren),
    ).toBe(true);
    expect(childRoutes.some((route) => route.path === 'case-files' && route.loadChildren)).toBe(
      true,
    );
    expect(childRoutes.some((route) => route.path === 'documents' && route.loadChildren)).toBe(
      true,
    );
    expect(childRoutes.some((route) => route.path === 'reports' && route.loadChildren)).toBe(true);
  });

  it('separates operational routes from suspended-safe organization administration', () => {
    const shellRoute = routes.find((route) => route.path === '' && route.children !== undefined);
    const childRoutes = shellRoute?.children ?? [];
    const operationalPaths = [
      'dashboard',
      'patients',
      'appointments',
      'case-files',
      'documents',
      'reports',
    ];

    for (const path of operationalPaths) {
      expect(childRoutes.find((route) => route.path === path)?.canActivate).toEqual([
        activeTenantGuard,
      ]);
    }

    expect(childRoutes.find((route) => route.path === 'financial-transactions')).toMatchObject({
      canActivate: [activeTenantGuard, capabilityGuard],
      data: { requiredCapability: 'finance.read' },
    });

    expect(childRoutes.find((route) => route.path === 'organization-administration')).toMatchObject(
      {
        canActivate: [capabilityGuard],
        data: { requiredCapability: 'organization.read' },
      },
    );
    expect(childRoutes.find((route) => route.path === 'membership-administration')).toMatchObject({
      canActivate: [capabilityGuard],
      data: { requiredCapability: 'membership.read' },
    });
    expect(childRoutes.find((route) => route.path === 'corporate')).toMatchObject({
      canActivate: [activeTenantGuard, capabilityGuard],
      data: { requiredCapability: 'organization.read' },
    });
    expect(childRoutes.find((route) => route.path === 'management/assessments')).toMatchObject({
      canActivate: [activeTenantGuard, capabilityGuard],
      data: { requiredCapability: 'assessment.template_manage' },
    });
    expect(childRoutes.find((route) => route.path === 'invitation-administration')).toMatchObject({
      canActivate: [activeTenantGuard, capabilityGuard],
      data: { requiredCapability: 'invitation.read' },
    });
    expect(childRoutes.find((route) => route.path === 'notification-templates')).toMatchObject({
      canActivate: [activeTenantGuard, capabilityGuard],
      data: { requiredCapability: 'notification_template.read' },
    });
    expect(childRoutes.find((route) => route.path === 'admin/tenants')).toMatchObject({
      canActivate: [superadminGuard],
    });
  });
});
