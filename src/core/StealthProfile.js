const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class StealthProfile {
  constructor({ proxy = null } = {}) {
    this.userAgent = USER_AGENTS[randomInt(0, USER_AGENTS.length - 1)];
    this.viewport = {
      width: randomInt(1280, 1920),
      height: randomInt(720, 1080),
    };
    this.proxy = proxy;
  }

  getLaunchArgs() {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ];
    if (this.proxy) {
      args.push(`--proxy-server=${this.proxy}`);
    }
    return args;
  }

  toJSON() {
    return {
      userAgent: this.userAgent,
      viewport: this.viewport,
      proxy: this.proxy,
    };
  }

  static fromJSON(json) {
    const profile = new StealthProfile({ proxy: json.proxy });
    profile.userAgent = json.userAgent;
    profile.viewport = json.viewport;
    return profile;
  }
}

module.exports = { StealthProfile };
