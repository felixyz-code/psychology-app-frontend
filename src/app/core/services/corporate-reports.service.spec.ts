import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { CorporateReportsService } from './corporate-reports.service';
import { environment } from '../../../environments/environment';

describe('CorporateReportsService', () => {
  let service: CorporateReportsService;
  let httpTesting: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/enterprise/corporate/agreements`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CorporateReportsService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CorporateReportsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch executive report', () => {
    service
      .getExecutiveReport('agr-1', {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
      .subscribe((res) => {
        expect(res.kpis.totalSessionsContracted).toBe(100);
        expect(res.departmentDistribution.length).toBe(1);
      });

    const req = httpTesting.expectOne(
      `${baseUrl}/agr-1/reports/executive?startDate=2026-01-01&endDate=2026-12-31`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      kpis: { totalSessionsContracted: 100, burnRatePercentage: 50 },
      departmentDistribution: [
        {
          department: 'Engineering',
          employeeCount: 6,
          sessionsConsumed: 12,
          percentageOfTotalSessions: 100,
          isAggregated: false,
        },
      ],
    });
  });

  it('should fetch billing statement', () => {
    service
      .getBillingStatement('agr-1', {
        unitPrice: 650,
      })
      .subscribe((res) => {
        expect(res.statementNumber).toBe('PAEF-BILL-123');
        expect(res.summary.totalAmount).toBe(6500);
      });

    const req = httpTesting.expectOne(`${baseUrl}/agr-1/reports/billing-statement?unitPrice=650`);
    expect(req.request.method).toBe('GET');
    req.flush({
      statementNumber: 'PAEF-BILL-123',
      summary: { totalAmount: 6500 },
    });
  });

  it('should download billing CSV blob', () => {
    service.downloadBillingCsv('agr-1').subscribe((blob) => {
      expect(blob).toBeTruthy();
    });

    const req = httpTesting.expectOne(`${baseUrl}/agr-1/reports/export/csv`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['test,csv'], { type: 'text/csv' }));
  });
});
