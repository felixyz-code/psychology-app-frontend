import { authGuard } from './core/guards/auth.guard';
import { routes } from './app.routes';

describe('app routes', () => {
  it('keeps login as the public route outside the protected shell', () => {
    const loginRoute = routes.find((route) => route.path === 'login');

    expect(loginRoute?.canActivate).toBeUndefined();
    expect(loginRoute?.loadComponent).toBeDefined();
  });

  it('keeps the root shell protected by the real auth guard', () => {
    const shellRoute = routes.find((route) => route.path === '');

    expect(shellRoute?.canActivate).toEqual([authGuard]);
    expect(shellRoute?.loadComponent).toBeDefined();
    expect(shellRoute?.children?.some((route) => route.path === 'dashboard' && route.loadComponent)).toBe(true);
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
    expect(childRoutes.some((route) => route.path === 'financial-transactions' && route.loadChildren)).toBe(true);
    expect(childRoutes.some((route) => route.path === 'case-files' && route.loadChildren)).toBe(true);
    expect(childRoutes.some((route) => route.path === 'documents' && route.loadChildren)).toBe(true);
    expect(childRoutes.some((route) => route.path === 'reports' && route.loadChildren)).toBe(true);
  });
});
