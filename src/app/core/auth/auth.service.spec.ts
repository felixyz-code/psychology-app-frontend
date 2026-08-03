import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { TenantContextStore } from '../tenant-context/tenant-context.store';
import { AuthUser, LoginRequest, LoginResponse } from './auth.models';
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

describe('AuthService', () => {
  let service: AuthService;
  let store: AuthStore;
  let tenantContextStore: {
    startForIdentity: ReturnType<typeof vi.fn>;
    resetTenantState: ReturnType<typeof vi.fn>;
  };
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    tenantContextStore = {
      startForIdentity: vi.fn(() => Promise.resolve()),
      resetTenantState: vi.fn(),
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

    httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush(
      { message: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(receivedError).toHaveBeenCalledOnce();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.token()).toBeNull();
  });

  it('does not replace a pre-existing session when login fails', () => {
    store.setSession('existing-token', user);
    const receivedError = vi.fn();

    service.login({ ...credentials, password: 'incorrect' }).subscribe({ error: receivedError });

    httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush(
      { message: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' }
    );

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
