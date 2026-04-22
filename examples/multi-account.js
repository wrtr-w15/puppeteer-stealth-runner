require('dotenv').config();
const { PuppeteerRunner } = require('../src/index');

const accounts = [
  { id: 'acc1', url: 'https://example.com' },
  { id: 'acc2', url: 'https://example.org' },
  { id: 'acc3', url: 'https://example.net' },
  { id: 'acc4', url: 'https://example.com' },
  { id: 'acc5', url: 'https://example.org' },
];

async function main() {
  const runner = new PuppeteerRunner({
    concurrency: 3,
    headless: true,
    defaultTimeout: 15000,
    onProgress: ({ account }) => {
      console.log(`[progress] finished account: ${account.id}`);
    },
  });

  console.log(`Processing ${accounts.length} accounts with concurrency=3...`);

  const { success, errors, stats } = await runner.run(accounts, async (page, account) => {
    await page.goto(account.url, { waitUntil: 'domcontentloaded' });
    return {
      accountId: account.id,
      url: account.url,
      title: await page.title(),
    };
  });

  console.log(`\nDone in ${stats.duration}ms`);
  console.log(`Success: ${success.length}/${stats.total} (${(stats.successRate * 100).toFixed(0)}%)`);
  if (errors.length) {
    console.error('Failed accounts:');
    errors.forEach(({ account, error }) => console.error(`  ${account.id}: ${error.message}`));
  }
  console.log('\nResults:', JSON.stringify(success, null, 2));

  await runner.close();
}

main().catch(console.error);
