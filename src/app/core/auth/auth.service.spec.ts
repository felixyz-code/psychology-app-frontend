import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { TENANT_HTTP_MODE } from '../tenant-context/tenant-http-context';
import {
  AuthUser,
  FreelancerBootstrapRequest,
  FreelancerBootstrapResponse,
  LoginRequest,
  LoginResponse,
} from './auth.models';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

const credentials: LoginRequest = {
  email: 'rivera@example.com',
  password: 'secret-password',
};

const user: AuthUser = {
  id: 'user-1',
  name: 'Dra. Rivera',
  email: credentials.email,
  role: 'PSYCHOLOGIST',
};

const loginResponse: LoginResponse = {
  accessToken: 'new-token',
  user,
};

const bootstrapRequest: FreelancerBootstrapRequest = {
  email: 'new@example.com',
  password: 'a-secure-password',
  name: 'Dra. Nueva',
  organizationName: 'Consulta Nueva',
};

const bootstrapResponse: FreelancerBootstrapResponse = {
  accessToken: 'bootstrap-token',
  user: { ...user, id: 'user-new', email: bootstrapRequest.email },
  organization: {
    id: 'organization-new',
    slug: 'consulta-nueva',
    legalName: 'Consulta Nueva',
    displayName: 'Consulta Nueva',
    status: 'ACTIVE',
    timezone: 'UTC',
    locale: 'es-MX',
    currency: 'MXN',
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
  },
  membership: {
    id: 'membership-new',
    userId: 'user-new',
    organizationId: 'organization-new',
    role: 'OWNER',
    status: 'ACTIVE',
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let store: AuthStore;
  let tenantContextStore: {
    startForIdentity: ReturnType<typeof vi.fn>;
    resetTenantState: ReturnType<typeof vi.fn>;
    switchTenant: ReturnType<typeof vi.fn>;
  };
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    tenantContextStore = {
      startForIdentity: vi.fn(() => Promise.resolve()),
      resetTenantState: vi.fn(),
      switchTenant: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TenantContextStore, useValue: tenantContextStore },
      ],
    });

    service = TestBed.inject(AuthService);
    store = TestBed.inject(AuthStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('sends credentials and persists the successful login response', async () => {
    let receivedResponse: LoginResponse | undefined;

    service.login(credentials).subscribe((response) => {
      receivedResponse = response;
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);

    request.flush(loginResponse);
    await Promise.resolve();

    expect(receivedResponse).toEqual(loginResponse);
    expect(store.token()).toBe(loginResponse.accessToken);
    expect(store.user()).toEqual(user);
    expect(tenantContextStore.startForIdentity).toHaveBeenCalledWith(user.id);
  });

  it('does not complete login navigation input until tenant context bootstrap resolves', async () => {
    let resolveContext: (() => void) | undefined;
    const contextReady = new Promise<void>((resolve) => {
      resolveContext = resolve;
    });
    tenantContextStore.startForIdentity.mockReturnValue(contextReady);

    let receivedResponse: LoginResponse | undefined;
    service.login(credentials).subscribe((response) => {
      receivedResponse = response;
    });

    httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush(loginResponse);
    await Promise.resolve();

    expect(receivedResponse).toBeUndefined();

    resolveContext?.();
    await contextReady;
    await Promise.resolve();

    expect(receivedResponse).toEqual(loginResponse);
  });

  it('keeps an anonymous user anonymous and exposes a login error', () => {
    const receivedError = vi.fn();

    service.login(credentials).subscribe({ error: receivedError });

    httpTesting
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError).toHaveBeenCalledOnce();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.token()).toBeNull();
  });

  it('posts the exact public freelancer bootstrap contract without tenant authority headers', async () => {
    const received = vi.fn();
    const callerValue = { ...bootstrapRequest, confirmPassword: bootstrapRequest.password };

    service.freelancerBootstrap(callerValue).subscribe(received);

    const request = httpTesting.expectOne(`${environment.apiUrl}/auth/freelancer-bootstrap`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(bootstrapRequest);
    expect(Object.keys(request.request.body)).toEqual([
      'email',
      'password',
      'name',
      'organizationName',
    ]);
    expect(request.request.body).not.toHaveProperty('confirmPassword');
    expect(request.request.context.get(TENANT_HTTP_MODE)).toBe('PUBLIC');
    expect(request.request.headers.has('X-Organization-Id')).toBe(false);
    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush(bootstrapResponse);
    await Promise.resolve();

    expect(received).toHaveBeenCalledWith(bootstrapResponse);
    expect(tenantContextStore.startForIdentity).toHaveBeenCalledWith(bootstrapResponse.user.id);
  });

  it('persists only identity data and never grants tenant authority from the bootstrap response', async () => {
    const setSession = vi.spyOn(store, 'setSession');

    service.freelancerBootstrap(bootstrapRequest).subscribe();
    httpTesting
      .expectOne(`${environment.apiUrl}/auth/freelancer-bootstrap`)
      .flush(bootstrapResponse);
    await Promise.resolve();

    expect(setSession).toHaveBeenCalledWith(bootstrapResponse.accessToken, bootstrapResponse.user);
    expect(tenantContextStore.startForIdentity).toHaveBeenCalledWith(bootstrapResponse.user.id);
    expect(setSession.mock.invocationCallOrder[0]).toBeLessThan(
      tenantContextStore.startForIdentity.mock.invocationCallOrder[0],
    );
    expect(tenantContextStore.switchTenant).not.toHaveBeenCalled();
    expect(localStorage.getItem('psychology_app_auth_user')).toBe(
      JSON.stringify(bootstrapResponse.user),
    );
    expect(localStorage.getItem('psychology_app_access_token')).toBe(bootstrapResponse.accessToken);
    expect(
      Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).sort(),
    ).toEqual(['psychology_app_access_token', 'psychology_app_auth_user']);
    expect(sessionStorage.length).toBe(0);
  });

  it('does not retry a failed freelancer bootstrap request', () => {
    const receivedError = vi.fn();

    service.freelancerBootstrap(bootstrapRequest).subscribe({ error: receivedError });
    const requests = httpTesting.match(`${environment.apiUrl}/auth/freelancer-bootstrap`);
    expect(requests).toHaveLength(1);
    requests[0].flush({}, { status: 500, statusText: 'Server Error' });

    expect(receivedError).toHaveBeenCalledOnce();
    expect(tenantContextStore.startForIdentity).not.toHaveBeenCalled();
  });

  it('does not replace a pre-existing session when login fails', () => {
    store.setSession('existing-token', user);
    const receivedError = vi.fn();

    service.login({ ...credentials, password: 'incorrect' }).subscribe({ error: receivedError });

    httpTesting
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError).toHaveBeenCalledOnce();
    expect(store.token()).toBe('existing-token');
    expect(store.user()).toEqual(user);
  });

  it('delegates logout to the store', () => {
    store.setSession('active-token', user);
    const clearSession = vi.spyOn(store, 'clearSession');

    service.logout();

    expect(clearSession).toHaveBeenCalledOnce();
    expect(tenantContextStore.resetTenantState).toHaveBeenCalledWith('logout');
    expect(store.isAuthenticated()).toBe(false);
  });
});
