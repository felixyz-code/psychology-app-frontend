import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { CorporateDashboardPage } from './corporate-dashboard.page';
import { CorporateService } from '../../../core/services/corporate.service';
import { BranchContextService } from '../../../core/services/branch-context.service';

describe('CorporateDashboardPage', () => {
  let component: CorporateDashboardPage;
  let fixture: ComponentFixture<CorporateDashboardPage>;
  let corporateService: any;

  beforeEach(async () => {
    corporateService = {
      getAgreements: vi.fn().mockReturnValue(
        of([
          {
            id: 'agr-1',
            title: 'Agreement Alpha',
            code: 'ALPHA-2026',
            status: 'ACTIVE',
            validFrom: '2026-01-01T00:00:00.000Z',
            validUntil: '2026-12-31T23:59:59.999Z',
            corporateClient: { id: 'c-1', name: 'Alpha Corp' },
            benefitPools: [{ totalSessions: 100, consumedSessions: 20, reservedSessions: 5 }],
          },
        ]),
      ),
      getClients: vi.fn().mockReturnValue(
        of([
          {
            id: 'c-1',
            name: 'Alpha Corp',
            isActive: true,
            domainWhitelist: ['@alpha.com'],
          },
        ]),
      ),
      getDebitLogs: vi.fn().mockReturnValue(of([])),
      createClient: vi.fn(),
      createAgreement: vi.fn(),
      checkEligibility: vi
        .fn()
        .mockReturnValue(of({ isEligible: true, reason: 'ELIGIBLE', message: 'OK' })),
    };

    await TestBed.configureTestingModule({
      imports: [CorporateDashboardPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CorporateService, useValue: corporateService },
        {
          provide: BranchContextService,
          useValue: { currentBranchId: () => 'branch-1' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CorporateDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load initial agreements and clients', () => {
    expect(component).toBeTruthy();
    expect(component.agreements().length).toBe(1);
    expect(component.clients().length).toBe(1);
    expect(corporateService.getAgreements).toHaveBeenCalled();
    expect(corporateService.getClients).toHaveBeenCalled();
  });

  it('should calculate agreement metrics properly', () => {
    const agr = component.agreements()[0];
    expect(component.getAgreementTotalSessions(agr)).toBe(100);
    expect(component.getAgreementConsumedSessions(agr)).toBe(25);
    expect(component.getAgreementUtilization(agr)).toBe(25);
  });

  it('should run live eligibility check', () => {
    component.checkForm.setValue({
      agreementId: 'agr-1',
      email: 'user@alpha.com',
      employeeNumber: 'EMP-01',
    });

    component.runEligibilityCheck();

    expect(corporateService.checkEligibility).toHaveBeenCalledWith({
      agreementId: 'agr-1',
      email: 'user@alpha.com',
      employeeNumber: 'EMP-01',
      branchId: 'branch-1',
    });
    expect(component.checkResult()?.isEligible).toBe(true);
  });
});
