async function retry(fn, {
  times, delay = 0, backoff = false, onRetry = null,
} = {}) {
  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === times) throw err;
      if (onRetry) onRetry(attempt, err);
      const wait = backoff ? delay * attempt : delay;
      if (wait > 0) await new Promise((r) => { setTimeout(r, wait); });
    }
  }
  return undefined;
}

module.exports = { retry };
