import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { appConfig } from './app.config';
import { routes } from './app.routes';
import { AuthStore } from './core/auth/auth.store';
import { HttpErrorPolicyService } from './core/errors/http-error-policy.service';

describe('appConfig', () => {
  let client: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
    client = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('configures Angular Router with the application route graph', () => {
    const router = TestBed.inject(Router);

    expect(router.config).toEqual(routes);
  });

  it('composes HttpClient with the global auth and error-policy interceptors', () => {
    const store = TestBed.inject(AuthStore);
    const errorPolicy = TestBed.inject(HttpErrorPolicyService);
    const handleError = vi.spyOn(errorPolicy, 'handle').mockReturnValue('server');

    store.setSession('active-token', {
      id: 'user-1',
      name: 'Dra. Rivera',
      email: 'rivera@example.com',
      role: 'PSYCHOLOGIST',
    });

    client.get('/api/protected').subscribe({ error: () => undefined });

    const request = httpTesting.expectOne('/api/protected');
    expect(request.request.headers.get('Authorization')).toBe('Bearer active-token');
    request.flush({ message: 'Unavailable' }, { status: 500, statusText: 'Server Error' });

    expect(handleError).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }), '/api/protected');
  });
});
