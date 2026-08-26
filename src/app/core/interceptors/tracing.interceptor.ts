import { HttpInterceptorFn } from '@angular/common/http';

export function generateHex(bytesCount: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(bytesCount);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Array.from({ length: bytesCount * 2 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
}

export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${generateHex(4)}-${generateHex(2)}-${generateHex(2)}-${generateHex(2)}-${generateHex(6)}`;
}

export const tracingInterceptor: HttpInterceptorFn = (req, next) => {
  const headers: Record<string, string> = {};

  if (!req.headers.has('x-request-id')) {
    headers['x-request-id'] = generateRequestId();
  }

  if (!req.headers.has('traceparent')) {
    const traceId = generateHex(16);
    const spanId = generateHex(8);
    headers['traceparent'] = `00-${traceId}-${spanId}-01`;
  }

  return next(Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req);
};
