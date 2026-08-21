export type AuditSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLogUser {
  id: string;
  name: string;
  email: string;
}

export interface AuditLogBranch {
  id: string;
  name: string;
  code: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  organizationId?: string | null;
  branchId?: string | null;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  severity?: AuditSeverity;
  ipAddress?: string | null;
  userAgent?: string | null;
  statusCode?: number | null;
  executionTimeMs?: number | null;
  actorRole?: string | null;
  details?: Record<string, any> | null;
  user?: AuditLogUser | null;
  branch?: AuditLogBranch | null;
}

export interface AuditLogsPaginatedResponse {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogsFilterParams {
  tenantId?: string;
  branchId?: string;
  userId?: string;
  resource?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  severity?: AuditSeverity;
  from?: string;
  to?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  format?: 'csv' | 'json';
  limit?: number;
  offset?: number;
}
