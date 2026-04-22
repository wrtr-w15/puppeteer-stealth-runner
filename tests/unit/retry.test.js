const { retry } = require('../../src/utils/retry');

describe('retry', () => {
  test('resolves immediately if function succeeds on first try', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await retry(fn, { times: 3, delay: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries on failure and eventually resolves', async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(async () => {
      calls++;
      if (calls < 3) throw new Error('not yet');
      return 'success';
    });
    const result = await retry(fn, { times: 3, delay: 0 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('throws after exceeding max retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));
    await expect(retry(fn, { times: 3, delay: 0 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('applies exponential backoff between retries', async () => {
    const delays = [];
    const originalSetTimeout = global.setTimeout;
    jest.spyOn(global, 'setTimeout').mockImplementation((fn, ms) => {
      delays.push(ms);
      return originalSetTimeout(fn, 0);
    });
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    await retry(fn, { times: 3, delay: 100, backoff: true });
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    jest.restoreAllMocks();
  });

  test('calls onRetry callback with attempt number and error', async () => {
    const onRetry = jest.fn();
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockResolvedValue('ok');
    await retry(fn, { times: 3, delay: 0, onRetry });
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });
});
