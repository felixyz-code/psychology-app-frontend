import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { CorporateService } from './corporate.service';
import { environment } from '../../../environments/environment';

describe('CorporateService', () => {
  let service: CorporateService;
  let httpTesting: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/enterprise/corporate`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CorporateService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CorporateService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch corporate clients', () => {
    service.getClients().subscribe((clients) => {
      expect(clients.length).toBe(1);
      expect(clients[0].name).toBe('Acme Corp');
    });

    const req = httpTesting.expectOne(`${baseUrl}/clients`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'c1', name: 'Acme Corp', isActive: true }]);
  });

  it('should create a corporate client', () => {
    service.createClient({ name: 'Globex' }).subscribe((client) => {
      expect(client.name).toBe('Globex');
    });

    const req = httpTesting.expectOne(`${baseUrl}/clients`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'c2', name: 'Globex', isActive: true });
  });

  it('should check employee eligibility in real-time', () => {
    service
      .checkEligibility({
        agreementId: 'agr-1',
        email: 'emp@globex.com',
      })
      .subscribe((res) => {
        expect(res.isEligible).toBe(true);
      });

    const req = httpTesting.expectOne(`${baseUrl}/eligibility/check`);
    expect(req.request.method).toBe('POST');
    req.flush({ isEligible: true, reason: 'ELIGIBLE', message: 'OK' });
  });

  it('should atomically reserve benefit session', () => {
    service
      .reserveSession({
        agreementId: 'agr-1',
        poolId: 'pool-1',
        eligibilityId: 'el-1',
      })
      .subscribe((res) => {
        expect(res.debitLog.status).toBe('RESERVED');
      });

    const req = httpTesting.expectOne(`${baseUrl}/debit/reserve`);
    expect(req.request.method).toBe('POST');
    req.flush({ debitLog: { id: 'deb-1', status: 'RESERVED' } });
  });
});
