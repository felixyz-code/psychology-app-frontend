import { HttpClient, HttpContext } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { TenantContextStore, TenantStateInvalidation } from './tenant-context.store';
import { TENANT_HTTP_MODE } from './tenant-http-context';
import { tenantStateInterceptor } from './tenant-state.interceptor';

describe('Cross-Tenant State Invalidation HTTP protection', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let generation: number;
  let selectedOrganizationId: string | null;
  let invalidations: Subject<TenantStateInvalidation>;
  let revalidateOperationalContext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    generation = 1;
    selectedOrganizationId = 'organization-a';
    invalidations = new Subject<TenantStateInvalidation>();
    revalidateOperationalContext = vi.fn(() => Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tenantStateInterceptor])),
        provideHttpClientTesting(),
        {
          provide: TenantContextStore,
          useValue: {
            invalidations: invalidations.asObservable(),
            selectedOrganizationId: () => selectedOrganizationId,
            switchGeneration: () => generation,
            contextVersion: () => 1,
            revalidateOperationalContext,
            isRequestContextCurrent: (
              requestGeneration: number,
              requestOrganizationId: string | null,
            ) =>
              requestGeneration === generation && requestOrganizationId === selectedOrganizationId,
          },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify({ ignoreCancelled: true });
    TestBed.resetTestingModule();
  });

  it('accepts a response only while generation and organization still match', () => {
    let response: string | undefined;

    http.get('/tenant-data', { responseType: 'text' }).subscribe((value) => {
      response = value;
    });

    httpTesting.expectOne('/tenant-data').flush('organization-a-data');

    expect(response).toBe('organization-a-data');
  });

  it('cancels A and B work during A to B to C and publishes only C', () => {
    const responses: string[] = [];

    http.get('/tenant-a', { responseType: 'text' }).subscribe((value) => responses.push(value));
    const requestA = httpTesting.expectOne('/tenant-a');

    generation = 2;
    selectedOrganizationId = 'organization-b';
    invalidations.next({ reason: 'tenant-switch', generation });

    http.get('/tenant-b', { responseType: 'text' }).subscribe((value) => responses.push(value));
    const requestB = httpTesting.expectOne('/tenant-b');

    generation = 3;
    selectedOrganizationId = 'organization-c';
    invalidations.next({ reason: 'tenant-switch', generation });

    http.get('/tenant-c', { responseType: 'text' }).subscribe((value) => responses.push(value));
    httpTesting.expectOne('/tenant-c').flush('organization-c-data');

    expect(requestA.cancelled).toBe(true);
    expect(requestB.cancelled).toBe(true);
    expect(responses).toEqual(['organization-c-data']);
  });

  it.each(['IDENTITY_ONLY', 'TENANT_OPTIONAL'] as const)(
    'does not revalidate after a 403 from a %s request',
    (mode) => {
      const errors: unknown[] = [];

      http
        .get('/non-operational', {
          context: new HttpContext().set(TENANT_HTTP_MODE, mode),
        })
        .subscribe({ error: (error) => errors.push(error) });
      httpTesting.expectOne('/non-operational').flush({}, { status: 403, statusText: 'Forbidden' });

      expect(errors).toHaveLength(1);
      expect(revalidateOperationalContext).not.toHaveBeenCalled();
    },
  );
});
