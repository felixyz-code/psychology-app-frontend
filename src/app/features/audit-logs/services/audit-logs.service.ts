import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AuditLogEntry,
  AuditLogsFilterParams,
  AuditLogsPaginatedResponse,
} from '../models/audit-log.models';

@Injectable({ providedIn: 'root' })
export class AuditLogsService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${environment.apiUrl}/audit-logs`;

  findAll(filters?: AuditLogsFilterParams): Observable<AuditLogsPaginatedResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.branchId) params = params.set('branchId', filters.branchId);
      if (filters.userId) params = params.set('userId', filters.userId);
      if (filters.resourceType) params = params.set('resourceType', filters.resourceType);
      if (filters.resourceId) params = params.set('resourceId', filters.resourceId);
      if (filters.action) params = params.set('action', filters.action);
      if (filters.from) params = params.set('from', filters.from);
      if (filters.to) params = params.set('to', filters.to);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.limit !== undefined) params = params.set('limit', String(filters.limit));
      if (filters.offset !== undefined) params = params.set('offset', String(filters.offset));
    }

    return this.http.get<AuditLogsPaginatedResponse>(this.basePath, { params });
  }

  findOne(id: string): Observable<AuditLogEntry> {
    return this.http.get<AuditLogEntry>(`${this.basePath}/${encodeURIComponent(id)}`);
  }

  exportToCsv(items: AuditLogEntry[], filename = 'audit_trail_report.csv'): void {
    if (!items || items.length === 0) return;

    const headers = [
      'ID',
      'Timestamp (UTC)',
      'Actor ID',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'Branch Name',
      'Branch Code',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent',
      'HTTP Status',
      'Execution Time (ms)',
      'Details (JSON)',
    ];

    const rows = items.map((entry) => [
      entry.id,
      entry.timestamp,
      entry.userId ?? '',
      entry.user?.name ?? '',
      entry.user?.email ?? '',
      entry.actorRole ?? '',
      entry.branch?.name ?? '',
      entry.branch?.code ?? '',
      entry.action,
      entry.resourceType,
      entry.resourceId ?? '',
      entry.ipAddress ?? '',
      `"${(entry.userAgent ?? '').replace(/"/g, '""')}"`,
      entry.statusCode ?? '',
      entry.executionTimeMs ?? '',
      `"${JSON.stringify(entry.details ?? {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportToJson(items: AuditLogEntry[], filename = 'audit_trail_report.json'): void {
    if (!items || items.length === 0) return;

    const jsonContent = JSON.stringify(items, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
