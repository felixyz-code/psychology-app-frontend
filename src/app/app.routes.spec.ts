import { authGuard } from './core/guards/auth.guard';
import { anonymousOnlyGuard } from './core/guards/anonymous-only.guard';
import { capabilityGuard } from './core/guards/capability.guard';
import { activeTenantGuard, tenantContextGuard } from './core/guards/tenant-context.guard';
import { routes } from './app.routes';

describe('app routes', () => {
  it('keeps login as the public route outside the protected shell', () => {
    const loginRoute = routes.find((route) => route.path === 'login');

    expect(loginRoute?.canActivate).toBeUndefined();
    expect(loginRoute?.loadComponent).toBeDefined();
  });

  it('exposes signup to anonymous users through the narrowly scoped anonymous-only policy', () => {
    const signupRoute = routes.find((route) => route.path === 'signup');

    expect(signupRoute?.canActivate).toEqual([anonymousOnlyGuard]);
    expect(signupRoute?.loadComponent).toBeDefined();
  });

  it('exposes organization selection behind authentication but outside tenant resolution', () => {
    const selectionRoute = routes.find((route) => route.path === 'organization-selection');

    expect(selectionRoute?.canActivate).toEqual([authGuard]);
    expect(selectionRoute?.loadComponent).toBeDefined();
  });

  it('keeps the root shell protected by the real auth guard', () => {
    const shellRoute = routes.find((route) => route.path === '');

    expect(shellRoute?.canActivate).toEqual([authGuard, tenantContextGuard]);
    expect(shellRoute?.loadComponent).toBeDefined();
    expect(
      shellRoute?.children?.some((route) => route.path === 'dashboard' && route.loadComponent),
    ).toBe(true);
  });

  it('keeps critical redirects and lazy feature children stable', () => {
    const shellRoute = routes.find((route) => route.path === '');
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
    const shellRoute = routes.find((route) => route.path === '');
    const childRoutes = shellRoute?.children ?? [];
    const operationalPaths = [
      'dashboard',
      'patients',
      'appointments',
      'financial-transactions',
      'case-files',
      'documents',
      'reports',
    ];

    for (const path of operationalPaths) {
      expect(childRoutes.find((route) => route.path === path)?.canActivate).toEqual([
        activeTenantGuard,
      ]);
    }

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
    expect(childRoutes.find((route) => route.path === 'invitation-administration')).toMatchObject({
      canActivate: [activeTenantGuard, capabilityGuard],
      data: { requiredCapability: 'invitation.read' },
    });
  });
});
