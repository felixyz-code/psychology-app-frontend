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

  it('should fetch paginated audit logs with filters', () => {
    const mockResponse: AuditLogsPaginatedResponse = {
      items: [
        {
          id: 'log-1',
          timestamp: '2026-08-17T12:00:00.000Z',
          action: 'CLINICAL_PATIENT_READ',
          resourceType: 'Patient',
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    };

    service
      .findAll({
        branchId: 'branch-1',
        resourceType: 'Patient',
        action: 'CLINICAL_PATIENT_READ',
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
        request.params.get('branchId') === 'branch-1' &&
        request.params.get('resourceType') === 'Patient' &&
        request.params.get('action') === 'CLINICAL_PATIENT_READ' &&
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
    };

    service.findOne('log-123').subscribe((res) => {
      expect(res).toEqual(mockEntry);
    });

    const req = httpTestingController.expectOne(`${baseUrl}/log-123`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEntry);
  });

  it('should trigger CSV and JSON export without crashing', () => {
    const mockItems: AuditLogEntry[] = [
      {
        id: 'log-1',
        timestamp: '2026-08-17T12:00:00.000Z',
        action: 'CLINICAL_PATIENT_READ',
        resourceType: 'Patient',
      },
    ];

    // Mock URL and createElement
    const createElementSpy = vi.spyOn(document, 'createElement');

    expect(() => service.exportToCsv(mockItems)).not.toThrow();
    expect(() => service.exportToJson(mockItems)).not.toThrow();
    expect(() => service.exportToCsv([])).not.toThrow();
    expect(() => service.exportToJson([])).not.toThrow();
  });
});
