const { BrowserPool } = require('../../src/core/BrowserPool');

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
});
