import { HttpClient, HttpHeaders, HttpRequest, HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthUser } from '../auth/auth.models';
import { AuthStore } from '../auth/auth.store';
import { authInterceptor } from './auth.interceptor';

const user: AuthUser = {
  id: 'user-1',
  name: 'Dra. Rivera',
  email: 'rivera@example.com',
  role: 'PSYCHOLOGIST',
};

describe('authInterceptor', () => {
  let client: HttpClient;
  let httpTesting: HttpTestingController;
  let store: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('adds the bearer token while preserving the protected request contents', () => {
    store.setSession('active-token', user);
    const body = { status: 'ACTIVE' };

    client.patch('/api/patients/user-1', body, { headers: new HttpHeaders({ 'X-Trace-Id': 'trace-1' }) }).subscribe();

    const request = httpTesting.expectOne('/api/patients/user-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.get('X-Trace-Id')).toBe('trace-1');
    expect(request.request.headers.get('Authorization')).toBe('Bearer active-token');
    request.flush({});
  });

  it('does not add Authorization when there is no token', () => {
    client.get('/api/patients').subscribe();

    const request = httpTesting.expectOne('/api/patients');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

  it('excludes the login endpoint even when a session exists', () => {
    store.setSession('active-token', user);

    client.post('/api/auth/login', { email: user.email, password: 'new-password' }).subscribe();

    const request = httpTesting.expectOne('/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('clones protected requests instead of mutating the original request', () => {
    store.setSession('active-token', user);
    const originalRequest = new HttpRequest('POST', '/api/appointments', { patientId: 'patient-1' });
    let forwardedRequest: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() =>
      authInterceptor(originalRequest, (request) => {
        forwardedRequest = request;
        return of(new HttpResponse({ status: 200 }));
      }).subscribe()
    );

    expect(forwardedRequest).not.toBe(originalRequest);
    expect(originalRequest.headers.has('Authorization')).toBe(false);
    expect(forwardedRequest?.headers.get('Authorization')).toBe('Bearer active-token');
    expect(forwardedRequest?.url).toBe(originalRequest.url);
    expect(forwardedRequest?.method).toBe(originalRequest.method);
    expect(forwardedRequest?.body).toEqual(originalRequest.body);
  });
});
