const { BrowserPool } = require('../../src/core/BrowserPool');
const { StealthProfile } = require('../../src/core/StealthProfile');

jest.mock('puppeteer-extra', () => ({
  use: jest.fn(),
  launch: jest.fn().mockResolvedValue({
    newContext: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({ close: jest.fn() }),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

describe('BrowserPool', () => {
  test('creates a context and returns it', async () => {
    const pool = new BrowserPool({ maxBrowsers: 2 });
    const ctx = await pool.acquire();
    expect(ctx).toBeDefined();
    await pool.close();
  });

  test('releases context back to pool', async () => {
    const pool = new BrowserPool({ maxBrowsers: 1 });
    const ctx = await pool.acquire();
    await pool.release(ctx);
    expect(pool.available).toBe(1);
    await pool.close();
  });

  test('closes all browsers on pool.close()', async () => {
    const pool = new BrowserPool({ maxBrowsers: 1 });
    await pool.acquire();
    await pool.close();
    expect(pool.size).toBe(0);
  });

  test('works without a rotator (rotator = null)', async () => {
    const pool = new BrowserPool({ maxBrowsers: 1, rotator: null });
    const ctx = await pool.acquire();
    expect(ctx).toBeDefined();
    await pool.close();
  });

  test('calls rotator.next() on each acquire()', async () => {
    const rotator = { next: jest.fn().mockReturnValue('http://proxy:8080') };
    const pool = new BrowserPool({ maxBrowsers: 2, rotator });
    await pool.acquire();
    await pool.acquire();
    expect(rotator.next).toHaveBeenCalledTimes(2);
    await pool.close();
  });

  test('passes proxy from rotator to StealthProfile on acquire()', async () => {
    const proxy = 'http://proxy:9090';
    const rotator = { next: jest.fn().mockReturnValue(proxy) };
    const spy = jest.spyOn(StealthProfile.prototype, 'getLaunchArgs');
    const pool = new BrowserPool({ rotator });
    await pool.acquire();
    const instance = spy.mock.instances[0];
    expect(instance.proxy).toBe(proxy);
    spy.mockRestore();
    await pool.close();
  });
});
