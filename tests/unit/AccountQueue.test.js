const { AccountQueue } = require('../../src/core/AccountQueue');

describe('AccountQueue', () => {
  test('processes all accounts and returns results', async () => {
    const queue = new AccountQueue({ concurrency: 2 });
    const accounts = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const { success } = await queue.run(accounts, async (acc) => acc.id * 10);
    expect(success).toEqual(expect.arrayContaining([10, 20, 30]));
  });

  test('never exceeds concurrency limit', async () => {
    let running = 0;
    let maxRunning = 0;
    const queue = new AccountQueue({ concurrency: 3 });
    const accounts = Array.from({ length: 9 }, (_, i) => ({ id: i }));

    await queue.run(accounts, async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => { setTimeout(r, 30); });
      running--;
    });

    expect(maxRunning).toBeLessThanOrEqual(3);
  });

  test('isolates errors — failed accounts go to errors, not stop queue', async () => {
    const queue = new AccountQueue({ concurrency: 2 });
    const accounts = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const { success, errors } = await queue.run(accounts, async (acc) => {
      if (acc.id === 2) throw new Error('account banned');
      return acc.id;
    });

    expect(success).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ account: { id: 2 }, error: expect.any(Error) });
  });

  test('calls onProgress callback after each account', async () => {
    const onProgress = jest.fn();
    const queue = new AccountQueue({ concurrency: 2, onProgress });
    const accounts = [{ id: 1 }, { id: 2 }];
    await queue.run(accounts, async (acc) => acc.id);
    expect(onProgress).toHaveBeenCalledTimes(2);
  });

  test('throws if concurrency is less than 1', () => {
    expect(() => new AccountQueue({ concurrency: 0 })).toThrow();
  });

  test('returns empty results for empty account list', async () => {
    const queue = new AccountQueue({ concurrency: 2 });
    const { success, errors } = await queue.run([], async () => {});
    expect(success).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});
