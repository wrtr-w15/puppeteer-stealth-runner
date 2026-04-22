const { StealthProfile } = require('../../src/core/StealthProfile');

describe('StealthProfile', () => {
  test('generates a valid user agent string', () => {
    const profile = new StealthProfile();
    expect(typeof profile.userAgent).toBe('string');
    expect(profile.userAgent.length).toBeGreaterThan(20);
  });

  test('generates unique fingerprints for different profiles', () => {
    const p1 = new StealthProfile();
    const p2 = new StealthProfile();
    expect(JSON.stringify(p1.viewport)).not.toBe(JSON.stringify(p2.viewport));
  });

  test('accepts and stores a proxy config', () => {
    const profile = new StealthProfile({ proxy: 'http://user:pass@proxy:8080' });
    expect(profile.proxy).toBe('http://user:pass@proxy:8080');
  });

  test('returns valid puppeteer launch args', () => {
    const profile = new StealthProfile({ proxy: 'http://proxy:8080' });
    const args = profile.getLaunchArgs();
    expect(args).toContain('--proxy-server=http://proxy:8080');
    expect(args).toContain('--no-sandbox');
  });

  test('serializes and deserializes to/from JSON', () => {
    const profile = new StealthProfile();
    const json = profile.toJSON();
    const restored = StealthProfile.fromJSON(json);
    expect(restored.userAgent).toBe(profile.userAgent);
  });
});
