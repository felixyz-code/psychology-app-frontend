import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { Location } from '@angular/common';
import { logError } from '../logging/app-logger';

export interface ClientDiagnosticPayload {
  readonly timestamp: string;
  readonly message: string;
  readonly name?: string;
  readonly stack?: string;
  readonly url: string;
  readonly context: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private readonly injector: Injector) {}

  handleError(error: unknown): void {
    try {
      const location = this.injector.get(Location, null);
      const url = location
        ? location.path()
        : typeof window !== 'undefined'
          ? window.location.pathname
          : '';

      const payload: ClientDiagnosticPayload = {
        timestamp: new Date().toISOString(),
        message: this.extractMessage(error),
        name: error instanceof Error ? error.name : undefined,
        stack: error instanceof Error ? error.stack : undefined,
        url,
        context: 'ANGULAR_RUNTIME_UNCAUGHT',
      };

      // Safe logging preventing raw PII/credential leakage to console
      logError('GlobalErrorHandler', error);
      this.sinkTelemetry(payload);
    } catch {
      // Guard against cascading exceptions within error handler
    }
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Unknown runtime error';
  }

  private sinkTelemetry(payload: ClientDiagnosticPayload): void {
    // Telemetry sink hook for Phase 6 remote telemetry / diagnostics buffer
    // Intentionally no-op in baseline without remote collector configured
    void payload;
  }
}
