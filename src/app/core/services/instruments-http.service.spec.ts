import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Instrument, InstrumentVersionStatus } from '../models/instrument.models';
import { InstrumentsHttpService } from './instruments-http.service';

describe('InstrumentsHttpService', () => {
  let service: InstrumentsHttpService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InstrumentsHttpService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(InstrumentsHttpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch clinical catalog via GET /instruments/catalog', () => {
    const mockInstruments: Partial<Instrument>[] = [{ id: 'inst-1', code: 'PHQ-9', name: 'PHQ-9' }];

    service.getClinicalCatalog().subscribe((res) => {
      expect(res).toHaveLength(1);
      expect(res[0].code).toBe('PHQ-9');
    });

    const req = httpMock.expectOne(`${apiUrl}/instruments/catalog`);
    expect(req.request.method).toBe('GET');
    req.flush(mockInstruments);
  });

  it('should fetch management catalog via GET /instruments/management/instruments', () => {
    const mockInstruments: Partial<Instrument>[] = [
      { id: 'inst-1', code: 'PHQ-9', name: 'PHQ-9', isEnabled: true },
    ];

    service.getManagementCatalog().subscribe((res) => {
      expect(res).toHaveLength(1);
      expect(res[0].isEnabled).toBe(true);
    });

    const req = httpMock.expectOne(`${apiUrl}/instruments/management/instruments`);
    expect(req.request.method).toBe('GET');
    req.flush(mockInstruments);
  });

  it('should toggle visibility via PATCH /instruments/management/instruments/:id/visibility', () => {
    service.toggleVisibility('inst-1', false).subscribe((res) => {
      expect(res.isEnabled).toBe(false);
    });

    const req = httpMock.expectOne(`${apiUrl}/instruments/management/instruments/inst-1/visibility`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ isEnabled: false });
    req.flush({ isEnabled: false });
  });

  it('should create custom instrument via POST /instruments/management/instruments', () => {
    const payload = { code: 'BAI', name: 'Beck Anxiety Inventory' };

    service.createInstrument(payload).subscribe((res) => {
      expect(res.code).toBe('BAI');
    });

    const req = httpMock.expectOne(`${apiUrl}/instruments/management/instruments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'inst-2', ...payload, isSystem: false });
  });

  it('should publish version via POST /instruments/management/instruments/:id/versions/:versionId/publish', () => {
    service.publishVersion('inst-1', 'ver-1').subscribe((res) => {
      expect(res.status).toBe(InstrumentVersionStatus.PUBLISHED);
    });

    const req = httpMock.expectOne(`${apiUrl}/instruments/management/instruments/inst-1/versions/ver-1/publish`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'ver-1', status: InstrumentVersionStatus.PUBLISHED });
  });

  it('should deprecate version via POST /instruments/management/instruments/:id/versions/:versionId/deprecate', () => {
    service.deprecateVersion('inst-1', 'ver-1').subscribe((res) => {
      expect(res.status).toBe(InstrumentVersionStatus.DEPRECATED);
    });

    const req = httpMock.expectOne(`${apiUrl}/instruments/management/instruments/inst-1/versions/ver-1/deprecate`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'ver-1', status: InstrumentVersionStatus.DEPRECATED });
  });

  it('should fetch version details via GET /instruments/versions/:versionId', () => {
    service.getVersionDetails('ver-1').subscribe((res) => {
      expect(res.id).toBe('ver-1');
    });

    const req = httpMock.expectOne(`${apiUrl}/instruments/versions/ver-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'ver-1', versionNumber: 1 });
  });
});
