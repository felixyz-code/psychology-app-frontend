import { isDevMode } from '@angular/core';

interface SafeErrorDetails {
  readonly operation: string;
  readonly status?: number;
  readonly stack?: string;
}

/**
 * Emits development-only diagnostics without serializing HTTP responses,
 * request payloads, file metadata, or error messages.
 */
export function logError(operation: string, error: unknown): void {
  if (!isDevMode()) {
    return;
  }

  const details: SafeErrorDetails = {
    operation,
    ...getHttpStatus(error),
    ...getStackTrace(error),
  };

  console.error('Application error', details);
}

function getHttpStatus(error: unknown): Pick<SafeErrorDetails, 'status'> {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return { status: error.status };
  }

  return {};
}

function getStackTrace(error: unknown): Pick<SafeErrorDetails, 'stack'> {
  if (!(error instanceof Error) || !error.stack) {
    return {};
  }

  const frames = error.stack.split('\n').slice(1).join('\n');

  return frames ? { stack: frames } : {};
}
