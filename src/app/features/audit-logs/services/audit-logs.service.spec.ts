import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AuditLogsService } from './audit-logs.service';
import { environment } from '../../../../environments/environment';
import { AuditLogEntry, AuditLogsPaginatedResponse } from '../models/audit-log.models';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let httpTestingController: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/audit-logs`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditLogsService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuditLogsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should fetch paginated audit logs with filters including severity and aliases', () => {
    const mockResponse: AuditLogsPaginatedResponse = {
      items: [
        {
          id: 'log-1',
          timestamp: '2026-08-17T12:00:00.000Z',
          action: 'CLINICAL_PATIENT_READ',
          resourceType: 'Patient',
          severity: 'INFO',
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    };

    service
      .findAll({
        tenantId: 'org-1',
        branchId: 'branch-1',
        resourceType: 'Patient',
        action: 'CLINICAL_PATIENT_READ',
        severity: 'INFO',
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-08-31T23:59:59.999Z',
        limit: 25,
        offset: 0,
      })
      .subscribe((res) => {
        expect(res).toEqual(mockResponse);
        expect(res.items.length).toBe(1);
      });

    const req = httpTestingController.expectOne((request) => {
      return (
        request.url === baseUrl &&
        request.params.get('tenantId') === 'org-1' &&
        request.params.get('branchId') === 'branch-1' &&
        request.params.get('resourceType') === 'Patient' &&
        request.params.get('action') === 'CLINICAL_PATIENT_READ' &&
        request.params.get('severity') === 'INFO' &&
        request.params.get('startDate') === '2026-08-01T00:00:00.000Z' &&
        request.params.get('endDate') === '2026-08-31T23:59:59.999Z' &&
        request.params.get('limit') === '25' &&
        request.params.get('offset') === '0'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch single audit log entry by ID', () => {
    const mockEntry: AuditLogEntry = {
      id: 'log-123',
      timestamp: '2026-08-17T12:00:00.000Z',
      action: 'CLINICAL_NOTE_CREATE',
      resourceType: 'SessionNote',
      resourceId: 'note-456',
      severity: 'MEDIUM',
    };

    service.findOne('log-123').subscribe((res) => {
      expect(res).toEqual(mockEntry);
    });

    const req = httpTestingController.expectOne(`${baseUrl}/log-123`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEntry);
  });

  it('should export audit logs via API endpoint', () => {
    const mockBlob = new Blob(['ID,Timestamp\n1,2026-08-19'], { type: 'text/csv' });

    service
      .exportViaApi(
        {
          branchId: 'branch-1',
          severity: 'HIGH',
        },
        'csv',
      )
      .subscribe((blob) => {
        expect(blob).toBeDefined();
      });

    const req = httpTestingController.expectOne((request) => {
      return (
        request.url === `${baseUrl}/export` &&
        request.params.get('format') === 'csv' &&
        request.params.get('branchId') === 'branch-1' &&
        request.params.get('severity') === 'HIGH'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockBlob);
  });

  it('should trigger CSV and JSON export without crashing', () => {
    const mockItems: AuditLogEntry[] = [
      {
        id: 'log-1',
        timestamp: '2026-08-17T12:00:00.000Z',
        action: 'CLINICAL_PATIENT_READ',
        resourceType: 'Patient',
        severity: 'INFO',
      },
    ];

    expect(() => service.exportToCsv(mockItems)).not.toThrow();
    expect(() => service.exportToJson(mockItems)).not.toThrow();
    expect(() => service.exportToCsv([])).not.toThrow();
    expect(() => service.exportToJson([])).not.toThrow();
  });

  it('should fetch global audit logs from /admin/audit-logs', () => {
    const mockResponse: AuditLogsPaginatedResponse = {
      items: [
        {
          id: 'log-global-1',
          timestamp: '2026-08-25T12:00:00.000Z',
          action: 'SUPERADMIN_TENANT_EXTEND_TRIAL',
          resourceType: 'Organization',
          severity: 'HIGH',
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    };

    service
      .findGlobal({
        search: 'TENANT',
        limit: 50,
        offset: 0,
      })
      .subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

    const req = httpTestingController.expectOne((request) => {
      return (
        request.url === `${environment.apiUrl}/admin/audit-logs` &&
        request.params.get('search') === 'TENANT' &&
        request.params.get('limit') === '50'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
