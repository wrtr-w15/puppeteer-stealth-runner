function delay(ms) {
  return new Promise((r) => { setTimeout(r, ms); });
}

async function randomDelay(min, max) {
  if (min > max) throw new Error('min must be <= max');
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
}

module.exports = { delay, randomDelay };
