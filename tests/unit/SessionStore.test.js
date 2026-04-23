const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { SessionStore } = require('../../src/core/SessionStore');

describe('SessionStore', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `session-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('save() writes a JSON file named {accountId}.json', async () => {
    const store = new SessionStore({ dir: tmpDir });
    const cookies = [{ name: 'session', value: 'abc123' }];
    await store.save('user1', cookies);
    const filePath = path.join(tmpDir, 'user1.json');
    const raw = await fs.readFile(filePath, 'utf8');
    expect(JSON.parse(raw)).toEqual(cookies);
  });

  test('load() returns cookies array from saved file', async () => {
    const store = new SessionStore({ dir: tmpDir });
    const cookies = [{ name: 'tok', value: 'xyz' }];
    await store.save('user2', cookies);
    const loaded = await store.load('user2');
    expect(loaded).toEqual(cookies);
  });

  test('load() returns null when no file exists for accountId', async () => {
    const store = new SessionStore({ dir: tmpDir });
    const result = await store.load('nonexistent');
    expect(result).toBeNull();
  });

  test('save() overwrites existing file', async () => {
    const store = new SessionStore({ dir: tmpDir });
    await store.save('user3', [{ name: 'old', value: '1' }]);
    await store.save('user3', [{ name: 'new', value: '2' }]);
    const loaded = await store.load('user3');
    expect(loaded).toEqual([{ name: 'new', value: '2' }]);
  });

  test('sanitizes accountId containing forward slashes', async () => {
    const store = new SessionStore({ dir: tmpDir });
    const cookies = [{ name: 'x', value: 'y' }];
    await store.save('group/user', cookies);
    const sanitized = path.join(tmpDir, 'group_user.json');
    const raw = await fs.readFile(sanitized, 'utf8');
    expect(JSON.parse(raw)).toEqual(cookies);
  });

  test('sanitizes accountId containing backslashes', async () => {
    const store = new SessionStore({ dir: tmpDir });
    const cookies = [{ name: 'a', value: 'b' }];
    await store.save('ns\\user', cookies);
    const sanitized = path.join(tmpDir, 'ns_user.json');
    const raw = await fs.readFile(sanitized, 'utf8');
    expect(JSON.parse(raw)).toEqual(cookies);
  });

  test('load() parses JSON into array correctly', async () => {
    const store = new SessionStore({ dir: tmpDir });
    const cookies = [
      { name: 'a', value: '1', domain: 'example.com' },
      { name: 'b', value: '2', domain: 'example.com' },
    ];
    await store.save('multi', cookies);
    const loaded = await store.load('multi');
    expect(loaded).toHaveLength(2);
    expect(loaded[0]).toMatchObject({ name: 'a', value: '1' });
    expect(loaded[1]).toMatchObject({ name: 'b', value: '2' });
  });
});
