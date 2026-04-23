class RateLimiter {
  constructor(options) {
    this.config = typeof options === 'number' ? { default: options } : options;
    this.buckets = new Map();
  }

  acquire(domain) {
    return new Promise((resolve) => {
      const bucket = this.bucketFor(domain);
      bucket.queue.push({ resolve });
      this.drain(domain);
    });
  }

  rateFor(domain) {
    return this.config[domain] ?? this.config.default ?? 5;
  }

  bucketFor(domain) {
    if (!this.buckets.has(domain)) {
      const rate = this.rateFor(domain);
      this.buckets.set(domain, {
        tokens: rate,
        lastRefill: Date.now(),
        queue: [],
        timer: null,
      });
    }
    return this.buckets.get(domain);
  }

  drain(domain) {
    const bucket = this.bucketFor(domain);
    if (bucket.timer !== null || bucket.queue.length === 0) return;

    const now = Date.now();
    const rate = this.rateFor(domain);
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(rate, bucket.tokens + elapsed * rate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      const { resolve } = bucket.queue.shift();
      resolve();
      if (bucket.queue.length > 0) {
        bucket.timer = setTimeout(() => {
          bucket.timer = null;
          this.drain(domain);
        }, 0);
      }
    } else {
      const wait = Math.ceil(((1 - bucket.tokens) / rate) * 1000);
      bucket.timer = setTimeout(() => {
        bucket.timer = null;
        this.drain(domain);
      }, wait);
    }
  }
}

module.exports = { RateLimiter };
