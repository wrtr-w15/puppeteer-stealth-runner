class ProxyRotator {
  constructor(proxies) {
    if (!Array.isArray(proxies) || proxies.length === 0) {
      throw new Error('ProxyRotator requires at least one proxy');
    }
    this.proxies = [...proxies];
    this.failed = new Set();
    this.index = 0;
  }

  next() {
    const { length } = this.proxies;
    for (let i = 0; i < length; i += 1) {
      const candidate = this.proxies[(this.index + i) % length];
      if (!this.failed.has(candidate)) {
        this.index = (this.index + i + 1) % length;
        return candidate;
      }
    }
    throw new Error('No active proxies available');
  }

  markFailed(proxy) {
    this.failed.add(proxy);
  }

  getActive() {
    return this.proxies.filter((p) => !this.failed.has(p));
  }

  get failedCount() {
    return this.failed.size;
  }
}

module.exports = { ProxyRotator };
