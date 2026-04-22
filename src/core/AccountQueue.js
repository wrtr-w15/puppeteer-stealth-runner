const pLimit = require('p-limit');

class AccountQueue {
  constructor({ concurrency, onProgress = null }) {
    if (concurrency < 1) throw new Error('concurrency must be >= 1');
    this.concurrency = concurrency;
    this.onProgress = onProgress;
  }

  async run(accounts, taskFn) {
    const limit = pLimit(this.concurrency);
    const success = [];
    const errors = [];

    await Promise.all(
      accounts.map((account) => limit(async () => {
        try {
          const result = await taskFn(account);
          success.push(result);
        } catch (error) {
          errors.push({ account, error, timestamp: new Date().toISOString() });
        } finally {
          if (this.onProgress) this.onProgress({ account, success, errors });
        }
      })),
    );

    return { success, errors };
  }
}

module.exports = { AccountQueue };
