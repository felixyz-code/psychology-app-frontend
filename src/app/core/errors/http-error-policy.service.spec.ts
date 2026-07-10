import { getHttpErrorKind } from './http-error-policy.service';

describe('getHttpErrorKind', () => {
  it.each([
    [0, 'network'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [429, 'rate-limited'],
    [500, 'server'],
    [503, 'server'],
    [400, 'other'],
  ] as const)('classifies status %i as %s', (status, expectedKind) => {
    expect(getHttpErrorKind(status)).toBe(expectedKind);
  });
});
