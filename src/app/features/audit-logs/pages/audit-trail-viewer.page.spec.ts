import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';

import { AuditTrailViewerPage } from './audit-trail-viewer.page';
import { AuditLogsService } from '../services/audit-logs.service';
import { BranchesService } from '../../../core/services/branches.service';
import { AuditLogEntry, AuditLogsPaginatedResponse } from '../models/audit-log.models';
import { Branch } from '../../../core/models/branch.models';

describe('AuditTrailViewerPage', () => {
  let component: AuditTrailViewerPage;
  let fixture: ComponentFixture<AuditTrailViewerPage>;
  let auditLogsServiceMock: {
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    exportToCsv: ReturnType<typeof vi.fn>;
    exportToJson: ReturnType<typeof vi.fn>;
  };
  let branchesServiceMock: {
    findAll: ReturnType<typeof vi.fn>;
  };
  let matDialogMock: {
    open: ReturnType<typeof vi.fn>;
  };

  const mockLogsResponse: AuditLogsPaginatedResponse = {
    items: [
      {
        id: 'log-1',
        timestamp: '2026-08-17T12:00:00.000Z',
        action: 'CLINICAL_PATIENT_READ',
        resourceType: 'Patient',
        resourceId: 'patient-1',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        executionTimeMs: 10,
        actorRole: 'OWNER',
        user: { id: 'u-1', name: 'Dr. Owner', email: 'owner@clinic.com' },
        branch: { id: 'b-1', name: 'Sede Central', code: 'SC01' },
      },
    ],
    total: 1,
    limit: 50,
    offset: 0,
  };

  const mockBranches: Branch[] = [
    {
      id: 'b-1',
      organizationId: 'org-1',
      name: 'Sede Central',
      code: 'SC01',
      address: 'Av. Reforma 100',
      phone: '555-0101',
      timezone: 'America/Mexico_City',
      isActive: true,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    auditLogsServiceMock = {
      findAll: vi.fn().mockReturnValue(of(mockLogsResponse)),
      findOne: vi.fn().mockReturnValue(of(mockLogsResponse.items[0])),
      exportToCsv: vi.fn(),
      exportToJson: vi.fn(),
    };

    branchesServiceMock = {
      findAll: vi.fn().mockReturnValue(of(mockBranches)),
    };

    matDialogMock = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of(undefined),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [AuditTrailViewerPage],
      providers: [
        { provide: AuditLogsService, useValue: auditLogsServiceMock },
        { provide: BranchesService, useValue: branchesServiceMock },
        { provide: MatDialog, useValue: matDialogMock },
      ],
    })
      .overrideComponent(AuditTrailViewerPage, {
        set: {
          providers: [{ provide: MatDialog, useValue: matDialogMock }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AuditTrailViewerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load branches and audit logs', () => {
    expect(component).toBeTruthy();
    expect(branchesServiceMock.findAll).toHaveBeenCalled();
    expect(auditLogsServiceMock.findAll).toHaveBeenCalled();
    expect(component.logsSignal().length).toBe(1);
    expect(component.totalSignal()).toBe(1);
    expect(component.branchesSignal().length).toBe(1);
  });

  it('should reload logs when filter changes', () => {
    component.selectedBranchId = 'b-1';
    component.selectedResourceType = 'Patient';
    component.searchTerm = 'CLINICAL';
    component.onFilterChange();

    expect(auditLogsServiceMock.findAll).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      branchId: 'b-1',
      resourceType: 'Patient',
      search: 'CLINICAL',
    });
  });

  it('should handle pagination changes', () => {
    component.onPageChange({ pageIndex: 2, pageSize: 25, length: 100 });
    expect(component.pageIndexSignal()).toBe(2);
    expect(component.pageSizeSignal()).toBe(25);
    expect(auditLogsServiceMock.findAll).toHaveBeenCalledWith({
      limit: 25,
      offset: 50,
    });
  });

  it('should open detail dialog when row is clicked', () => {
    const entry = mockLogsResponse.items[0];
    component.openDetail(entry);
    expect(matDialogMock.open).toHaveBeenCalledWith(expect.any(Function), {
      data: entry,
      width: '680px',
    });
  });

  it('should trigger exports on service', () => {
    component.exportCsv();
    expect(auditLogsServiceMock.exportToCsv).toHaveBeenCalledWith(mockLogsResponse.items);

    component.exportJson();
    expect(auditLogsServiceMock.exportToJson).toHaveBeenCalledWith(mockLogsResponse.items);
  });

  it('should compute correct CSS class for different forensic action categories', () => {
    expect(component.getActionClass('CLINICAL_PATIENT_READ')).toBe('read');
    expect(component.getActionClass('CLINICAL_NOTE_CREATE')).toBe('mutation');
    expect(component.getActionClass('CLINICAL_DOCUMENT_DELETE')).toBe('delete');
    expect(component.getActionClass('AUTH_ROLE_CHANGE')).toBe('security');
  });
});
