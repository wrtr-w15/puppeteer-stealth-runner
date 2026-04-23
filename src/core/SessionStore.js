const fs = require('fs/promises');
const path = require('path');

class SessionStore {
  constructor({ dir }) {
    this.dir = dir;
  }

  async save(accountId, cookies) {
    await fs.writeFile(this.filePath(accountId), JSON.stringify(cookies), 'utf8');
  }

  async load(accountId) {
    try {
      const data = await fs.readFile(this.filePath(accountId), 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  filePath(accountId) {
    const safe = String(accountId).replace(/[/\\]/g, '_');
    return path.join(this.dir, `${safe}.json`);
  }
}

module.exports = { SessionStore };
