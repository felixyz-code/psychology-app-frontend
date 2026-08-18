import { Location } from '@angular/common';
import { Injector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  it('handles standard Error instances safely', () => {
    const mockLocation = {
      path: vi.fn().mockReturnValue('/patients/123'),
    };

    const injectorMock = {
      get: vi.fn().mockImplementation((token) => {
        if (token === Location) return mockLocation;
        return null;
      }),
    } as unknown as Injector;

    const handler = new GlobalErrorHandler(injectorMock);
    const testError = new Error('Test application crash');

    expect(() => handler.handleError(testError)).not.toThrow();
  });

  it('handles string errors and non-Error objects safely', () => {
    const injectorMock = {
      get: vi.fn().mockReturnValue(null),
    } as unknown as Injector;

    const handler = new GlobalErrorHandler(injectorMock);

    expect(() => handler.handleError('Fatal string error')).not.toThrow();
    expect(() => handler.handleError({ custom: 'error' })).not.toThrow();
    expect(() => handler.handleError(null)).not.toThrow();
    expect(() => handler.handleError(undefined)).not.toThrow();
  });

  it('does not throw when injector fails', () => {
    const badInjector = {
      get: vi.fn().mockImplementation(() => {
        throw new Error('Injector failure');
      }),
    } as unknown as Injector;

    const handler = new GlobalErrorHandler(badInjector);

    expect(() => handler.handleError(new Error('Boom'))).not.toThrow();
  });
});
