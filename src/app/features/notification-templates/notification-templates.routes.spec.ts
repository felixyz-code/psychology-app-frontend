import { notificationTemplatesRoutes } from './notification-templates.routes';

describe('notificationTemplatesRoutes', () => {
  it('defines empty default route leading to NotificationTemplatesListPage', async () => {
    expect(notificationTemplatesRoutes[0].path).toBe('');
    const loadFn = notificationTemplatesRoutes[0].loadComponent;
    expect(loadFn).toBeDefined();
    if (loadFn) {
      const component = await (loadFn as any)();
      expect(component).toBeTruthy();
    }
  });
});
