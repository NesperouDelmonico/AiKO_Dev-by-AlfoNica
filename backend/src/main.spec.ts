import { parseTrustProxy } from './trust-proxy';

describe('parseTrustProxy', () => {
  it('defaults to false when TRUST_PROXY is not set', () => {
    expect(parseTrustProxy(undefined)).toBe(false);
  });

  it.each([
    ['false', false],
    ['true', true],
    ['0', 0],
    ['2', 2],
  ])('parses %s', (value, expected) => {
    expect(parseTrustProxy(value)).toBe(expected);
  });

  it.each(['', '-1', '1.5', 'yes', '9007199254740992'])(
    'rejects invalid value %s',
    (value) => {
      expect(() => parseTrustProxy(value)).toThrow('TRUST_PROXY');
    },
  );
});
