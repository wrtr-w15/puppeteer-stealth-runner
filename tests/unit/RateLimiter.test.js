const { RateLimiter } = require('../../src/utils/RateLimiter');

describe('RateLimiter', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('resolves immediately when tokens are available', async () => {
    const limiter = new RateLimiter(5);
    const resolved = jest.fn();
    limiter.acquire('a.com').then(resolved);
    await Promise.resolve();
    expect(resolved).toHaveBeenCalled();
  });

  test('delays second request when rate is 1 req/s', async () => {
    const limiter = new RateLimiter(1);
    const order = [];

    limiter.acquire('a.com').then(() => order.push(1));
    const second = limiter.acquire('a.com').then(() => order.push(2));

    await Promise.resolve();
    expect(order).toEqual([1]);

    jest.advanceTimersByTime(1000);
    await second;
    expect(order).toEqual([1, 2]);
  });

  test('resolves multiple requests in FIFO order', async () => {
    const limiter = new RateLimiter(1);
    const order = [];

    const p1 = limiter.acquire('b.com').then(() => order.push(1));
    const p2 = limiter.acquire('b.com').then(() => order.push(2));
    const p3 = limiter.acquire('b.com').then(() => order.push(3));

    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.all([p1, p2, p3]);

    expect(order).toEqual([1, 2, 3]);
  });

  test('accepts a plain number as global rate for all domains', async () => {
    const limiter = new RateLimiter(10);
    const resolved = jest.fn();
    limiter.acquire('x.com').then(resolved);
    await Promise.resolve();
    expect(resolved).toHaveBeenCalled();
  });

  test('applies per-domain rate from object config', async () => {
    const limiter = new RateLimiter({ 'slow.com': 1, default: 10 });

    const fastResolved = jest.fn();
    const slowResolved = jest.fn();

    limiter.acquire('fast.com').then(fastResolved);
    await Promise.resolve();
    expect(fastResolved).toHaveBeenCalled();

    limiter.acquire('slow.com').then(slowResolved);
    limiter.acquire('slow.com').then(slowResolved);
    await Promise.resolve();
    expect(slowResolved).toHaveBeenCalledTimes(1);
  });

  test('different domains have independent buckets', async () => {
    const limiter = new RateLimiter(1);
    const resolvedA = jest.fn();
    const resolvedB = jest.fn();

    limiter.acquire('a.com').then(resolvedA);
    limiter.acquire('b.com').then(resolvedB);

    await Promise.resolve();
    expect(resolvedA).toHaveBeenCalled();
    expect(resolvedB).toHaveBeenCalled();
  });

  test('tokens refill over time allowing more requests', async () => {
    const limiter = new RateLimiter(1);
    const order = [];

    const p1 = limiter.acquire('c.com').then(() => order.push(1));
    const p2 = limiter.acquire('c.com').then(() => order.push(2));

    await Promise.resolve();
    expect(order).toHaveLength(1);

    jest.advanceTimersByTime(1000);
    await p2;
    expect(order).toHaveLength(2);
    await p1;
  });

  test('uses default rate when domain not in per-domain config', async () => {
    const limiter = new RateLimiter({ 'known.com': 1, default: 5 });
    const resolved = jest.fn();
    limiter.acquire('unknown.com').then(resolved);
    await Promise.resolve();
    expect(resolved).toHaveBeenCalled();
  });
});
