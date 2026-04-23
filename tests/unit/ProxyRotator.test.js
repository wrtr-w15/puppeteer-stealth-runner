const { ProxyRotator } = require('../../src/core/ProxyRotator');

describe('ProxyRotator', () => {
  test('throws on empty array', () => {
    expect(() => new ProxyRotator([])).toThrow('ProxyRotator requires at least one proxy');
  });

  test('returns proxies in round-robin order', () => {
    const rotator = new ProxyRotator(['a', 'b', 'c']);
    expect(rotator.next()).toBe('a');
    expect(rotator.next()).toBe('b');
    expect(rotator.next()).toBe('c');
  });

  test('wraps around after last proxy', () => {
    const rotator = new ProxyRotator(['a', 'b']);
    rotator.next();
    rotator.next();
    expect(rotator.next()).toBe('a');
  });

  test('skips failed proxies in rotation', () => {
    const rotator = new ProxyRotator(['a', 'b', 'c']);
    rotator.markFailed('b');
    expect(rotator.next()).toBe('a');
    expect(rotator.next()).toBe('c');
    expect(rotator.next()).toBe('a');
  });

  test('getActive returns only non-failed proxies', () => {
    const rotator = new ProxyRotator(['a', 'b', 'c']);
    rotator.markFailed('b');
    expect(rotator.getActive()).toEqual(['a', 'c']);
  });

  test('throws when all proxies are marked failed', () => {
    const rotator = new ProxyRotator(['a', 'b']);
    rotator.markFailed('a');
    rotator.markFailed('b');
    expect(() => rotator.next()).toThrow('No active proxies available');
  });

  test('markFailed with unknown proxy is a no-op', () => {
    const rotator = new ProxyRotator(['a']);
    expect(() => rotator.markFailed('unknown')).not.toThrow();
    expect(rotator.getActive()).toEqual(['a']);
  });

  test('failedCount reflects number of failed proxies', () => {
    const rotator = new ProxyRotator(['a', 'b', 'c']);
    expect(rotator.failedCount).toBe(0);
    rotator.markFailed('a');
    rotator.markFailed('b');
    expect(rotator.failedCount).toBe(2);
  });

  test('single proxy rotates back to itself', () => {
    const rotator = new ProxyRotator(['only']);
    expect(rotator.next()).toBe('only');
    expect(rotator.next()).toBe('only');
  });
});
