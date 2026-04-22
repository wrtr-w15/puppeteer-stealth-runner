require('dotenv').config();
const { PuppeteerRunner } = require('../src/index');

async function main() {
  const runner = new PuppeteerRunner({ concurrency: 1, headless: true });
  const accounts = [{ id: 'demo', url: 'https://example.com' }];

  const { success, errors, stats } = await runner.run(accounts, async (page, account) => {
    await page.goto(account.url, { waitUntil: 'networkidle2' });
    const title = await page.title();
    const heading = await page.$eval('h1', (el) => el.textContent).catch(() => null);
    return { accountId: account.id, title, heading };
  });

  console.log('Results:', JSON.stringify(success, null, 2));
  if (errors.length) console.error('Errors:', errors);
  console.log('Stats:', stats);

  await runner.close();
}

main().catch(console.error);
