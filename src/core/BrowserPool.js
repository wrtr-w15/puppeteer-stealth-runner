const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { StealthProfile } = require('./StealthProfile');

puppeteer.use(StealthPlugin());

async function createContext(browser) {
  if (typeof browser.newContext === 'function') {
    return browser.newContext();
  }
  return browser.createIncognitoBrowserContext();
}

class BrowserPool {
  constructor({ maxBrowsers = 5, rotator = null } = {}) {
    this.maxBrowsers = maxBrowsers;
    this.rotator = rotator;
    this.browsers = [];
    this.available = 0;
  }

  get size() {
    return this.browsers.length;
  }

  async acquire() {
    const proxy = this.rotator ? this.rotator.next() : null;
    const profile = new StealthProfile({ proxy });
    const browser = await puppeteer.launch({
      headless: true,
      args: profile.getLaunchArgs(),
    });
    this.browsers.push(browser);
    const context = await createContext(browser);
    this.available = Math.max(0, this.available - 1);
    return context;
  }

  async release(context) {
    await context.close();
    this.available += 1;
  }

  async close() {
    await Promise.all(this.browsers.map((b) => b.close()));
    this.browsers = [];
    this.available = 0;
  }
}

module.exports = { BrowserPool };
