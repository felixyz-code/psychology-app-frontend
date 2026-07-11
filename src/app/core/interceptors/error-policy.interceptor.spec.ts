import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';

import { HttpErrorPolicyService } from '../errors/http-error-policy.service';
import { errorPolicyInterceptor } from './error-policy.interceptor';

describe('errorPolicyInterceptor', () => {
  let errorPolicy: { handle: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    errorPolicy = { handle: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: HttpErrorPolicyService, useValue: errorPolicy }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('delegates an HTTP error once and rethrows it to the subscriber', () => {
    const originalError = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
    const request = new HttpRequest('GET', '/api/reports');
    const receivedError = vi.fn();
    const receivedNext = vi.fn();

    TestBed.runInInjectionContext(() =>
      errorPolicyInterceptor(request, () => throwError(() => originalError)).subscribe({
        next: receivedNext,
        error: receivedError,
      })
    );

    expect(errorPolicy.handle).toHaveBeenCalledOnce();
    expect(errorPolicy.handle).toHaveBeenCalledWith(originalError, '/api/reports');
    expect(receivedNext).not.toHaveBeenCalled();
    expect(receivedError).toHaveBeenCalledWith(originalError);
  });
});
