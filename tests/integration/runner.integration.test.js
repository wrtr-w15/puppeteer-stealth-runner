const { PuppeteerRunner } = require('../../src/index');

describe('PuppeteerRunner integration', () => {
  test('runs a basic task across multiple accounts', async () => {
    const runner = new PuppeteerRunner({ concurrency: 2, headless: true });
    const accounts = [{ id: 'a1' }, { id: 'a2' }];

    const { success, errors } = await runner.run(accounts, async (page, account) => {
      await page.goto('about:blank');
      return { accountId: account.id, title: await page.title() };
    });

    expect(errors).toHaveLength(0);
    expect(success).toHaveLength(2);
    await runner.close();
  }, 30000);
});
