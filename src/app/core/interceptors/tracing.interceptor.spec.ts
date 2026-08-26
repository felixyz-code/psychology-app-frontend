import { HttpRequest, HttpHandlerFn, HttpResponse, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, it, expect } from 'vitest';
import { tracingInterceptor, generateHex, generateRequestId } from './tracing.interceptor';

describe('tracingInterceptor', () => {
  it('generates hex strings of expected length', () => {
    expect(generateHex(16)).toHaveLength(32);
    expect(generateHex(8)).toHaveLength(16);
    expect(generateHex(16)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates a valid request ID', () => {
    const reqId = generateRequestId();
    expect(reqId).toBeTruthy();
    expect(reqId.length).toBeGreaterThanOrEqual(16);
  });

  it('attaches x-request-id and W3C traceparent headers to outgoing requests', () => {
    let interceptedRequest: HttpRequest<unknown> | undefined;
    const next: HttpHandlerFn = (req) => {
      interceptedRequest = req;
      return of(new HttpResponse({ status: 200 }));
    };

    const req = new HttpRequest('GET', '/api/patients');
    tracingInterceptor(req, next);

    expect(interceptedRequest).toBeDefined();
    if (!interceptedRequest) throw new Error('Request was not intercepted');

    const requestId = interceptedRequest.headers.get('x-request-id');
    const traceparent = interceptedRequest.headers.get('traceparent');

    expect(requestId).toBeTruthy();
    expect(traceparent).toBeTruthy();
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it('preserves existing x-request-id and traceparent if already provided', () => {
    let interceptedRequest: HttpRequest<unknown> | undefined;
    const next: HttpHandlerFn = (req) => {
      interceptedRequest = req;
      return of(new HttpResponse({ status: 200 }));
    };

    const customTrace = '00-11112222333344445555666677778888-aaaabbbbccccdddd-01';
    const req = new HttpRequest('POST', '/api/appointments', {}, {
      headers: new HttpHeaders({
        'x-request-id': 'custom-req-id-123',
        traceparent: customTrace,
      }),
    });

    tracingInterceptor(req, next);

    expect(interceptedRequest).toBeDefined();
    if (!interceptedRequest) throw new Error('Request was not intercepted');

    expect(interceptedRequest.headers.get('x-request-id')).toBe('custom-req-id-123');
    expect(interceptedRequest.headers.get('traceparent')).toBe(customTrace);
  });
});
