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
  branchId?: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
