# puppeteer-stealth-runner

[![CI](https://github.com/wrtr-w15/puppeteer-stealth-runner/actions/workflows/ci.yml/badge.svg)](https://github.com/wrtr-w15/puppeteer-stealth-runner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Concurrent browser automation framework with isolated stealth profiles.
> Built with TDD — 90%+ test coverage.

## Features

- **Concurrent execution** — process multiple accounts in parallel with `p-limit`
- **Stealth profiles** — randomized fingerprints, user agents, and viewports per browser instance
- **Error isolation** — individual task failures never halt the queue
- **Proxy support** — per-profile proxy configuration
- **Structured logging** — Winston-based JSON logging with configurable levels
- **Retry with backoff** — configurable exponential backoff for flaky operations
- **Human-like delays** — randomized delays to reduce bot detection

## Quick Start

```bash
npm install puppeteer-stealth-runner
```

```js
const { PuppeteerRunner } = require('puppeteer-stealth-runner');

const runner = new PuppeteerRunner({ concurrency: 3 });
const accounts = [{ id: 'user1' }, { id: 'user2' }, { id: 'user3' }];

const { success, errors, stats } = await runner.run(accounts, async (page, account) => {
  await page.goto('https://example.com');
  return { accountId: account.id, title: await page.title() };
});

console.log(`Done: ${success.length}/${stats.total} in ${stats.duration}ms`);
await runner.close();
```

## API Reference

### PuppeteerRunner

Main entry point. Orchestrates `BrowserPool` and `AccountQueue`.

```js
const runner = new PuppeteerRunner(options);
```

| Option | Type | Default | Description |
|---|---|---|---|
| `concurrency` | `number` | `2` | Max parallel browser contexts |
| `headless` | `boolean` | `true` | Run browsers headlessly |
| `defaultTimeout` | `number` | `30000` | Page navigation timeout (ms) |
| `onProgress` | `function` | `null` | Called after each account completes |

#### `runner.run(accounts, taskFn)`

- `accounts` — array of objects (any shape)
- `taskFn(page, account)` — async function receiving a `puppeteer.Page` and the account object
- Returns `{ success[], errors[], stats: { total, duration, successRate } }`

#### `runner.close()`

Closes all browser instances.

---

### AccountQueue

Manages concurrent task execution with error isolation.

```js
const { AccountQueue } = require('puppeteer-stealth-runner/src/core/AccountQueue');

const queue = new AccountQueue({ concurrency: 5, onProgress: ({ account }) => console.log(account.id) });
const { success, errors } = await queue.run(accounts, async (account) => { /* ... */ });
```

Error objects in `errors[]` include: `{ account, error, timestamp }`.

---

### StealthProfile

Generates randomized browser fingerprints.

```js
const { StealthProfile } = require('puppeteer-stealth-runner/src/core/StealthProfile');

const profile = new StealthProfile({ proxy: 'http://user:pass@proxy:8080' });
console.log(profile.userAgent);  // random Chrome UA
console.log(profile.viewport);  // { width: 1440, height: 900 }
console.log(profile.getLaunchArgs());  // ['--no-sandbox', '--proxy-server=...', ...]

// Serialize / restore
const json = profile.toJSON();
const restored = StealthProfile.fromJSON(json);
```

---

### retry / delay utilities

```js
const { retry } = require('puppeteer-stealth-runner/src/utils/retry');
const { delay, randomDelay } = require('puppeteer-stealth-runner/src/utils/delay');

// Retry with exponential backoff
const result = await retry(() => fetchData(), {
  times: 3,
  delay: 500,
  backoff: true,
  onRetry: (attempt, err) => console.warn(`Attempt ${attempt}: ${err.message}`),
});

// Human-like pause
await randomDelay(500, 2000);
```

## Examples

### Basic scraper

```bash
node examples/basic-scraper.js
```

Navigates to `example.com` and extracts the page title.

### Multi-account with concurrency

```bash
node examples/multi-account.js
```

Processes 5 accounts with `concurrency: 3`, shows per-account progress and final stats.

## Architecture

```
PuppeteerRunner
├── AccountQueue      — p-limit concurrency, error isolation, onProgress hook
├── BrowserPool       — browser lifecycle, context creation, cleanup
└── StealthProfile    — randomized UA, viewport, proxy, launch args

utils/
├── retry.js          — retry with exponential backoff + onRetry callback
├── delay.js          — fixed and random delays
└── logger.js         — Winston structured logger (JSON + console)
```

Each browser context is isolated (incognito). Stealth profiles are generated per acquisition to avoid fingerprint reuse.

## Why I built this

Most scraping frameworks either lack proper concurrency management or expose raw browser APIs without guardrails. This project demonstrates:

- **TDD discipline** — every module has failing tests before implementation
- **Production patterns** — error isolation, retries, logging, CI, coverage gates
- **Clean API** — callers only interact with `PuppeteerRunner`; internals are swappable

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Write failing tests first
4. Implement to make them pass
5. Ensure `npm run test:unit` and `npm run lint` pass
6. Open a PR

## License

MIT
