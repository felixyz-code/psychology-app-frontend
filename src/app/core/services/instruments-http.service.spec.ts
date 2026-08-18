import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Instrument } from '../models/instrument.models';
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

  it('should fetch accessible instruments via GET /instruments', () => {
    const mockInstruments: Partial<Instrument>[] = [{ id: 'inst-1', code: 'PHQ-9', name: 'PHQ-9' }];

    service.getInstruments().subscribe((res) => {
      expect(res).toHaveLength(1);
      expect(res[0].code).toBe('PHQ-9');
    });

    const req = httpMock.expectOne(`${apiUrl}/instruments`);
    expect(req.request.method).toBe('GET');
    req.flush(mockInstruments);
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
