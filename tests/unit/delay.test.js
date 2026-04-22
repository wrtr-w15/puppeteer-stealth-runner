const { delay, randomDelay } = require('../../src/utils/delay');

describe('delay', () => {
  test('resolves after approximately the given milliseconds', async () => {
    const start = Date.now();
    await delay(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });

  test('resolves with 0ms without error', async () => {
    await expect(delay(0)).resolves.toBeUndefined();
  });
});

describe('randomDelay', () => {
  test('resolves in a time within [min, max] range', async () => {
    const start = Date.now();
    await randomDelay(50, 150);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(300);
  });

  test('throws if min > max', async () => {
    await expect(randomDelay(200, 100)).rejects.toThrow();
  });
});
