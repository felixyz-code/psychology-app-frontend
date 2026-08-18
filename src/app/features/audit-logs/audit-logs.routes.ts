import { Routes } from '@angular/router';
import { AuditTrailViewerPage } from './pages/audit-trail-viewer.page';

export const auditLogsRoutes: Routes = [
  {
    path: '',
    component: AuditTrailViewerPage,
  },
];
