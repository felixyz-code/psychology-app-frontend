import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AgreementDetailPage } from './agreement-detail.page';
import { CorporateService } from '../../../core/services/corporate.service';

describe('AgreementDetailPage', () => {
  let component: AgreementDetailPage;
  let fixture: ComponentFixture<AgreementDetailPage>;
  let corporateService: any;

  beforeEach(async () => {
    corporateService = {
      getAgreement: vi.fn().mockReturnValue(
        of({
          id: 'agr-1',
          title: 'Agreement Alpha',
          code: 'ALPHA-2026',
          status: 'ACTIVE',
          defaultMaxSessionsPerEmployee: 5,
          corporateClient: { id: 'c-1', name: 'Alpha Corp' },
        }),
      ),
      getPools: vi.fn().mockReturnValue(
        of([
          {
            id: 'p-1',
            name: 'Q1 Pool',
            totalSessions: 50,
            consumedSessions: 10,
            reservedSessions: 5,
            availableSessions: 35,
            utilizationPercentage: 30,
            status: 'ACTIVE',
          },
        ]),
      ),
      getEligibility: vi.fn().mockReturnValue(
        of([
          {
            id: 'e-1',
            email: 'john@alpha.com',
            firstName: 'John',
            lastName: 'Doe',
            maxSessionsAllowed: 5,
            consumedSessions: 1,
            reservedSessions: 0,
            availableSessions: 4,
            status: 'ACTIVE',
          },
        ]),
      ),
      createPool: vi.fn(),
      createEligibility: vi.fn(),
      batchEligibility: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AgreementDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'agr-1' } } },
        },
        { provide: CorporateService, useValue: corporateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgreementDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load agreement details, pools and roster', () => {
    expect(component).toBeTruthy();
    expect(component.agreement()?.code).toBe('ALPHA-2026');
    expect(component.pools().length).toBe(1);
    expect(component.employees().length).toBe(1);
    expect(corporateService.getAgreement).toHaveBeenCalledWith('agr-1');
    expect(corporateService.getPools).toHaveBeenCalledWith('agr-1');
    expect(corporateService.getEligibility).toHaveBeenCalledWith('agr-1');
  });
});
