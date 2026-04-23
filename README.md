# puppeteer-stealth-runner

[![CI](https://github.com/wrtr-w15/puppeteer-stealth-runner/actions/workflows/ci.yml/badge.svg)](https://github.com/wrtr-w15/puppeteer-stealth-runner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Coverage: 98%](https://img.shields.io/badge/coverage-98%25-brightgreen)](./coverage/lcov-report/index.html)

> Concurrent browser automation framework with stealth profiles, proxy rotation,
> session persistence, rate limiting, and auth handling. Built with TDD — 98% test coverage.

## Features

- **Concurrent execution** — run tasks across multiple accounts in parallel via `p-limit`
- **Stealth profiles** — randomized user agents, viewports, and fingerprints per browser instance
- **Proxy rotation** — round-robin cycling with automatic failed-proxy tracking
- **Session persistence** — save and restore cookies between runs via `SessionStore`
- **Rate limiting** — per-domain token bucket with FIFO queuing
- **Auth handler** — reusable CSS-selector login flow with `isLoggedIn()` guard
- **Error isolation** — individual task failures never halt the queue
- **Retry with backoff** — configurable exponential backoff for flaky operations
- **Human-like delays** — randomized pauses to reduce bot detection signals
- **Structured logging** — Winston-based JSON logging with configurable levels

## Quick Start

```bash
npm install puppeteer-stealth-runner
```

```js
const { PuppeteerRunner } = require('puppeteer-stealth-runner');
const { ProxyRotator } = require('puppeteer-stealth-runner/src/core/ProxyRotator');
const { SessionStore } = require('puppeteer-stealth-runner/src/core/SessionStore');
const { RateLimiter } = require('puppeteer-stealth-runner/src/utils/RateLimiter');

const runner = new PuppeteerRunner({
  concurrency: 3,
  proxyRotator: new ProxyRotator(['http://proxy1:8080', 'http://proxy2:8080']),
  sessionStore: new SessionStore({ dir: './sessions' }),
  rateLimiter: new RateLimiter({ 'example.com': 2, default: 5 }),
});

const accounts = [
  { id: 'user1', email: 'alice@example.com', password: 'pass1' },
  { id: 'user2', email: 'bob@example.com',   password: 'pass2' },
];

const { success, errors, stats } = await runner.run(
  accounts,
  async (page, account, { rateLimiter }) => {
    await rateLimiter.acquire('example.com');
    await page.goto('https://example.com/dashboard');
    return { accountId: account.id, title: await page.title() };
  },
);

console.log(`Done: ${success.length}/${stats.total} in ${stats.duration}ms`);
await runner.close();
```

## API Reference

### PuppeteerRunner

Main entry point. Orchestrates `BrowserPool`, `AccountQueue`, `SessionStore`, and `RateLimiter`.

```js
const runner = new PuppeteerRunner(options);
```

| Option | Type | Default | Description |
|---|---|---|---|
| `concurrency` | `number` | `2` | Max parallel browser contexts |
| `headless` | `boolean` | `true` | Run browsers headlessly |
| `defaultTimeout` | `number` | `30000` | Page navigation timeout (ms) |
| `onProgress` | `function` | `null` | Called after each account completes |
| `proxyRotator` | `ProxyRotator` | `null` | Proxy rotator instance |
| `sessionStore` | `SessionStore` | `null` | Cookie persistence store |
| `rateLimiter` | `RateLimiter` | `null` | Shared rate limiter instance |

#### `runner.run(accounts, taskFn)`

- `accounts` — array of objects (any shape, must have an `id` field when using `sessionStore`)
- `taskFn(page, account, { rateLimiter })` — async function receiving a Puppeteer `Page`, the account object, and optional utilities
- Returns `{ success[], errors[], stats: { total, duration, successRate } }`

Error objects in `errors[]` include: `{ account, error, timestamp }`.

#### `runner.close()`

Closes all browser instances.

---

### ProxyRotator

Round-robin proxy rotation with failed-proxy tracking.

```js
const { ProxyRotator } = require('puppeteer-stealth-runner/src/core/ProxyRotator');

const rotator = new ProxyRotator([
  'http://user:pass@proxy1:8080',
  'http://user:pass@proxy2:8080',
  'http://user:pass@proxy3:8080',
]);

rotator.next();              // 'http://...proxy1:8080'
rotator.next();              // 'http://...proxy2:8080'
rotator.markFailed('http://user:pass@proxy2:8080');
rotator.next();              // 'http://...proxy3:8080' (skips failed)
rotator.getActive();         // ['proxy1', 'proxy3']
rotator.failedCount;         // 1
```

| Method | Description |
|---|---|
| `next()` | Returns next available proxy (round-robin). Throws if all are failed. |
| `markFailed(proxy)` | Permanently removes proxy from rotation. |
| `getActive()` | Returns all non-failed proxy strings. |
| `failedCount` | Number of failed proxies. |

---

### SessionStore

Per-account cookie persistence backed by JSON files.

```js
const { SessionStore } = require('puppeteer-stealth-runner/src/core/SessionStore');

const store = new SessionStore({ dir: './sessions' });

// Save cookies after a successful run
const cookies = await page.cookies();
await store.save(account.id, cookies);

// Restore cookies before navigating
const saved = await store.load(account.id);  // null if no session saved yet
if (saved) await page.setCookie(...saved);
```

When passed to `PuppeteerRunner`, cookie injection and saving happen automatically around each `taskFn` call.

| Method | Description |
|---|---|
| `save(accountId, cookies)` | Writes `{dir}/{accountId}.json`. Overwrites if exists. |
| `load(accountId)` | Returns cookie array or `null` if no file found. |

---

### RateLimiter

Token bucket rate limiter with per-domain config and FIFO queuing.

```js
const { RateLimiter } = require('puppeteer-stealth-runner/src/utils/RateLimiter');

// Global rate: 5 req/s for all domains
const limiter = new RateLimiter(5);

// Per-domain rates with fallback default
const limiter = new RateLimiter({ 'api.example.com': 1, default: 5 });

// In taskFn — throttle before each request
await rateLimiter.acquire('api.example.com');
await page.goto('https://api.example.com/data');
```

| Method | Description |
|---|---|
| `acquire(domain)` | Returns a `Promise<void>` that resolves when a rate slot is available. |

The limiter is shared across all concurrent `taskFn` calls when passed to `PuppeteerRunner`, so the rate is enforced globally across all parallel workers.

---

### AuthHandler

Reusable login flow via CSS selectors.

```js
const { AuthHandler } = require('puppeteer-stealth-runner/src/core/AuthHandler');

const auth = new AuthHandler({
  loginUrl:          'https://example.com/login',
  usernameSelector:  '#email',
  passwordSelector:  '#password',
  submitSelector:    'button[type=submit]',  // null → presses Enter
  successSelector:   '.dashboard',
  timeout:           10000,
});

// Inside taskFn:
const { success } = await runner.run(accounts, async (page, account) => {
  if (!await auth.isLoggedIn(page)) {
    await auth.login(page, { username: account.email, password: account.password });
  }
  // ... rest of task
});
```

| Method | Description |
|---|---|
| `login(page, { username, password })` | Navigates to `loginUrl`, fills the form, submits, waits for `successSelector`. Throws on timeout. |
| `isLoggedIn(page)` | Returns `true` if `successSelector` is present without navigating. |

---

### AccountQueue

Manages concurrent task execution with error isolation.

```js
const { AccountQueue } = require('puppeteer-stealth-runner/src/core/AccountQueue');

const queue = new AccountQueue({
  concurrency: 5,
  onProgress: ({ account, success, errors }) => console.log(account.id),
});
const { success, errors } = await queue.run(accounts, async (account) => { /* ... */ });
```

---

### StealthProfile

Generates randomized browser fingerprints.

```js
const { StealthProfile } = require('puppeteer-stealth-runner/src/core/StealthProfile');

const profile = new StealthProfile({ proxy: 'http://user:pass@proxy:8080' });
console.log(profile.userAgent);       // random Chrome/Firefox/Safari UA string
console.log(profile.viewport);        // { width: 1440, height: 900 }
console.log(profile.getLaunchArgs()); // ['--no-sandbox', '--proxy-server=...', ...]

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

```bash
node examples/basic-scraper.js   # single account, title extraction
node examples/multi-account.js   # 5 accounts, concurrency=3, progress reporting
```

## Architecture

```
PuppeteerRunner
├── BrowserPool       — browser lifecycle, context isolation, proxy injection
│   └── StealthProfile — randomized UA, viewport, proxy, launch args
├── AccountQueue      — p-limit concurrency, error isolation, onProgress hook
├── SessionStore      — per-account cookie persistence (JSON files)
└── RateLimiter       — per-domain token bucket with FIFO queue

src/core/
├── AuthHandler.js    — CSS-selector login flow, isLoggedIn() guard
├── ProxyRotator.js   — round-robin rotation, markFailed(), getActive()

utils/
├── retry.js          — retry with exponential backoff + onRetry callback
├── delay.js          — fixed and random delays
└── logger.js         — Winston structured logger (JSON + console)
```

Each browser context is isolated (incognito). Stealth profiles are generated per acquisition to avoid fingerprint reuse across accounts.

## Why I built this

Most scraping frameworks either lack proper concurrency management or expose raw browser APIs without guardrails. This project demonstrates:

- **TDD discipline** — every module has failing tests before implementation
- **Production patterns** — proxy rotation, session management, rate limiting, retries, structured logging, CI, coverage gates
- **Clean API** — callers only interact with `PuppeteerRunner`; all internals are independently testable and swappable

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Write failing tests first
4. Implement to make them pass
5. Ensure `npm run test:unit` and `npm run lint` pass
6. Open a PR

## License

MIT
