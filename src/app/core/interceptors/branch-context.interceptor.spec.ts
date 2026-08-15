import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { BranchContextService } from '../services/branch-context.service';
import { branchContextInterceptor } from './branch-context.interceptor';
import { TENANT_HTTP_MODE } from '../tenant-context/tenant-http-context';

describe('branchContextInterceptor', () => {
  let client: HttpClient;
  let httpTesting: HttpTestingController;
  let currentBranchIdSignal: ReturnType<typeof signal<string | null>>;

  beforeEach(() => {
    currentBranchIdSignal = signal<string | null>(null);

    const branchContextServiceMock = {
      currentBranchId: currentBranchIdSignal,
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([branchContextInterceptor])),
        provideHttpClientTesting(),
        { provide: BranchContextService, useValue: branchContextServiceMock },
      ],
    });

    client = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('adds x-branch-id header when active branch is selected', () => {
    currentBranchIdSignal.set('branch-123');

    client.get('/api/patients').subscribe();

    const req = httpTesting.expectOne('/api/patients');
    expect(req.request.headers.get('x-branch-id')).toBe('branch-123');
    req.flush([]);
  });

  it('omits x-branch-id header when no branch is selected', () => {
    currentBranchIdSignal.set(null);

    client.get('/api/patients').subscribe();

    const req = httpTesting.expectOne('/api/patients');
    expect(req.request.headers.has('x-branch-id')).toBe(false);
    req.flush([]);
  });

  it('omits x-branch-id header for PUBLIC mode requests even when branch is active', () => {
    currentBranchIdSignal.set('branch-123');

    client
      .get('/api/public/info', {
        context: new HttpContext().set(TENANT_HTTP_MODE, 'PUBLIC'),
      })
      .subscribe();

    const req = httpTesting.expectOne('/api/public/info');
    expect(req.request.headers.has('x-branch-id')).toBe(false);
    req.flush({});
  });

  it('preserves existing custom x-branch-id header if already present', () => {
    currentBranchIdSignal.set('branch-default');

    client
      .get('/api/appointments', {
        headers: { 'x-branch-id': 'branch-override' },
      })
      .subscribe();

    const req = httpTesting.expectOne('/api/appointments');
    expect(req.request.headers.get('x-branch-id')).toBe('branch-override');
    req.flush([]);
  });
});
