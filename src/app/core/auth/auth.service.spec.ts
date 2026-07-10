import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
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
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
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

  it('sends credentials and persists the successful login response', () => {
    let receivedResponse: LoginResponse | undefined;

    service.login(credentials).subscribe((response) => {
      receivedResponse = response;
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);

    request.flush(loginResponse);

    expect(receivedResponse).toEqual(loginResponse);
    expect(store.token()).toBe(loginResponse.accessToken);
    expect(store.user()).toEqual(user);
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
    expect(store.isAuthenticated()).toBe(false);
  });
});
