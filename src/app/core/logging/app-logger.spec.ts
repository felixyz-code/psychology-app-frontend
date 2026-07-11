import { logError } from './app-logger';

describe('logError', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits only the allowed fields from a valid error event', () => {
    const error = { status: 503, message: 'Patient name: Ana', payload: { patientId: 'patient-1' } };

    logError('load-dashboard', error);

    expect(consoleError).toHaveBeenCalledWith('Application error', {
      operation: 'load-dashboard',
      status: 503,
    });
  });

  it('discards fields that are not explicitly allowed', () => {
    const error = {
      status: 400,
      email: 'patient@example.com',
      request: { body: { notes: 'private note' } },
      response: { error: 'validation failed' },
    };

    logError('save-patient', error);

    const details = consoleError.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(details).toEqual({ operation: 'save-patient', status: 400 });
    expect(details['email']).toBeUndefined();
    expect(details['request']).toBeUndefined();
    expect(details['response']).toBeUndefined();
  });

  it('does not serialize unauthorized nested objects when status is absent', () => {
    logError('upload-document', {
      file: { name: 'clinical-record.pdf', size: 1200 },
      caseFile: { patient: { firstName: 'Ana' } },
    });

    expect(consoleError).toHaveBeenCalledWith('Application error', {
      operation: 'upload-document',
    });
  });

  it('keeps optional stack details for Error instances without mutating the input', () => {
    const error = new Error('Private backend message');
    error.stack = 'Error: Private backend message\n    at safe-frame';

    logError('load-reports', error);

    expect(consoleError).toHaveBeenCalledWith('Application error', {
      operation: 'load-reports',
      stack: '    at safe-frame',
    });
    expect(error.message).toBe('Private backend message');
    expect(error.stack).toBe('Error: Private backend message\n    at safe-frame');
  });
});
