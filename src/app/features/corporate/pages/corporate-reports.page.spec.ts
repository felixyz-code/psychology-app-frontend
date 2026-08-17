import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CorporateReportsPage } from './corporate-reports.page';
import { CorporateReportsService } from '../../../core/services/corporate-reports.service';

describe('CorporateReportsPage', () => {
  let component: CorporateReportsPage;
  let fixture: ComponentFixture<CorporateReportsPage>;
  let reportsService: any;

  const mockExecutiveReport = {
    agreement: {
      id: 'agr-1',
      code: 'PAEF-ACME',
      title: 'Convenio ACME',
      status: 'ACTIVE',
      corporateClient: {
        id: 'client-1',
        name: 'ACME Corp',
        commercialName: 'ACME',
      },
    },
    kpis: {
      totalSessionsContracted: 100,
      totalSessionsConsumed: 45,
      totalSessionsReserved: 10,
      totalSessionsAvailable: 45,
      burnRatePercentage: 45,
      uniqueEmployeesEntitled: 20,
      uniqueEmployeesAttended: 12,
      coveragePercentage: 60,
    },
    poolBreakdown: [
      {
        poolId: 'pool-1',
        name: 'Bolsa General',
        totalSessions: 100,
        consumedSessions: 45,
        reservedSessions: 10,
        availableSessions: 45,
        utilizationPercentage: 45,
        status: 'ACTIVE',
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
      },
    ],
    departmentDistribution: [
      {
        department: 'Ingeniería',
        employeeCount: 10,
        sessionsConsumed: 30,
        percentageOfTotalSessions: 66.7,
        isAggregated: false,
      },
      {
        department: 'Otros / Departamentos Agrupados (k < 5)',
        employeeCount: 4,
        sessionsConsumed: 15,
        percentageOfTotalSessions: 33.3,
        isAggregated: true,
      },
    ],
    periodSummary: {
      startDate: null,
      endDate: null,
      branchId: null,
      totalConfirmedInPeriod: 45,
    },
    privacyNotice: 'Zero ePHI Guarantee',
  };

  const mockBillingStatement = {
    statementNumber: 'PAEF-BILL-123',
    generatedAt: '2026-06-30T23:59:59Z',
    agreement: {
      id: 'agr-1',
      code: 'PAEF-ACME',
      title: 'Convenio ACME',
      corporateClient: {
        id: 'client-1',
        name: 'ACME Corp',
        taxId: 'ACM850101XYZ',
        contactEmail: 'rh@acme.com',
        contactPhone: null,
      },
    },
    billingPeriod: {
      startDate: '2026-06-01T00:00:00Z',
      endDate: '2026-06-30T23:59:59Z',
    },
    unitPrice: 500,
    currency: 'MXN',
    summary: {
      billableSessionsCount: 45,
      subtotal: 22500,
      ivaTaxRate: 0.16,
      ivaAmount: 3600,
      totalAmount: 26100,
    },
    poolReconciliation: [
      {
        poolId: 'pool-1',
        poolName: 'Bolsa General',
        periodConfirmedSessions: 45,
        poolTotalSessions: 100,
        poolConsumedTotal: 45,
      },
    ],
    debitItems: [
      {
        debitId: 'deb-1',
        timestamp: '2026-06-05T10:00:00Z',
        sessionQuantity: 1,
        branchId: 'branch-1',
        branchName: 'Sede Central',
        status: 'CONFIRMED',
      },
    ],
    privacyNotice: 'Zero ePHI Guarantee',
  };

  beforeEach(async () => {
    reportsService = {
      getExecutiveReport: vi.fn().mockReturnValue(of(mockExecutiveReport)),
      getBillingStatement: vi.fn().mockReturnValue(of(mockBillingStatement)),
      downloadBillingCsv: vi.fn().mockReturnValue(of(new Blob(['test']))),
    };

    await TestBed.configureTestingModule({
      imports: [CorporateReportsPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue('agr-1'),
              },
            },
          },
        },
        {
          provide: CorporateReportsService,
          useValue: reportsService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CorporateReportsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load executive report and billing statement on init', () => {
    expect(reportsService.getExecutiveReport).toHaveBeenCalledWith('agr-1', {
      startDate: undefined,
      endDate: undefined,
      unitPrice: 500,
    });
    expect(reportsService.getBillingStatement).toHaveBeenCalledWith('agr-1', {
      startDate: undefined,
      endDate: undefined,
      unitPrice: 500,
    });

    expect(component.executiveReport()?.kpis.totalSessionsContracted).toBe(100);
    expect(component.billingStatement()?.statementNumber).toBe('PAEF-BILL-123');
  });

  it('should apply k-anonymity badge on aggregated departments', () => {
    const depts = component.departments();
    expect(depts.length).toBe(2);
    expect(depts[0].isAggregated).toBe(false);
    expect(depts[1].isAggregated).toBe(true);
    expect(depts[1].department).toBe('Otros / Departamentos Agrupados (k < 5)');
  });
});
