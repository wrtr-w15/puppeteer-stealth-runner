const { BrowserPool } = require('./core/BrowserPool');
const { AccountQueue } = require('./core/AccountQueue');

class PuppeteerRunner {
  constructor({
    concurrency = parseInt(process.env.DEFAULT_CONCURRENCY, 10) || 2,
    headless = true,
    defaultTimeout = parseInt(process.env.DEFAULT_TIMEOUT, 10) || 30000,
    onProgress = null,
  } = {}) {
    this.concurrency = concurrency;
    this.headless = headless;
    this.defaultTimeout = defaultTimeout;
    this.onProgress = onProgress;
    this.pool = new BrowserPool({ maxBrowsers: concurrency });
  }

  async run(accounts, taskFn) {
    const startTime = Date.now();
    const queue = new AccountQueue({
      concurrency: this.concurrency,
      onProgress: this.onProgress,
    });

    const { success, errors } = await queue.run(accounts, async (account) => {
      const context = await this.pool.acquire();
      const page = await context.newPage();
      page.setDefaultTimeout(this.defaultTimeout);
      try {
        return await taskFn(page, account);
      } finally {
        await page.close();
        await this.pool.release(context);
      }
    });

    const duration = Date.now() - startTime;
    const stats = {
      total: accounts.length,
      duration,
      successRate: accounts.length > 0 ? success.length / accounts.length : 0,
    };

    return { success, errors, stats };
  }

  async close() {
    await this.pool.close();
  }
}

module.exports = { PuppeteerRunner };
