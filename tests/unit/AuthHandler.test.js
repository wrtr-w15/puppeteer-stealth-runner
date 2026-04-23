const { AuthHandler } = require('../../src/core/AuthHandler');

function makePage(overrides = {}) {
  return {
    goto: jest.fn().mockResolvedValue(undefined),
    waitForSelector: jest.fn().mockResolvedValue(undefined),
    type: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    keyboard: { press: jest.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
}

const BASE_CONFIG = {
  loginUrl: 'https://example.com/login',
  usernameSelector: '#email',
  passwordSelector: '#password',
  submitSelector: 'button[type=submit]',
  successSelector: '.dashboard',
};

describe('AuthHandler', () => {
  test('login() navigates to loginUrl', async () => {
    const page = makePage();
    const auth = new AuthHandler(BASE_CONFIG);
    await auth.login(page, { username: 'u', password: 'p' });
    expect(page.goto).toHaveBeenCalledWith(BASE_CONFIG.loginUrl, { waitUntil: 'domcontentloaded' });
  });

  test('login() types username and password into correct selectors', async () => {
    const page = makePage();
    const auth = new AuthHandler(BASE_CONFIG);
    await auth.login(page, { username: 'alice', password: 'secret' });
    expect(page.type).toHaveBeenCalledWith('#email', 'alice');
    expect(page.type).toHaveBeenCalledWith('#password', 'secret');
  });

  test('login() clicks submitSelector when provided', async () => {
    const page = makePage();
    const auth = new AuthHandler(BASE_CONFIG);
    await auth.login(page, { username: 'u', password: 'p' });
    expect(page.click).toHaveBeenCalledWith('button[type=submit]');
    expect(page.keyboard.press).not.toHaveBeenCalled();
  });

  test('login() presses Enter when submitSelector is null', async () => {
    const page = makePage();
    const auth = new AuthHandler({ ...BASE_CONFIG, submitSelector: null });
    await auth.login(page, { username: 'u', password: 'p' });
    expect(page.keyboard.press).toHaveBeenCalledWith('Enter');
    expect(page.click).not.toHaveBeenCalled();
  });

  test('login() waits for successSelector after submit', async () => {
    const page = makePage();
    const auth = new AuthHandler(BASE_CONFIG);
    await auth.login(page, { username: 'u', password: 'p' });
    const calls = page.waitForSelector.mock.calls.map((c) => c[0]);
    expect(calls).toContain('.dashboard');
  });

  test('login() throws when successSelector times out', async () => {
    const page = makePage({
      waitForSelector: jest.fn().mockImplementation((selector) => {
        if (selector === '.dashboard') return Promise.reject(new Error('timeout'));
        return Promise.resolve();
      }),
    });
    const auth = new AuthHandler(BASE_CONFIG);
    await expect(auth.login(page, { username: 'u', password: 'p' })).rejects.toThrow('timeout');
  });

  test('isLoggedIn() returns true when successSelector is present', async () => {
    const page = makePage();
    const auth = new AuthHandler(BASE_CONFIG);
    const result = await auth.isLoggedIn(page);
    expect(result).toBe(true);
  });

  test('isLoggedIn() returns false when successSelector is absent', async () => {
    const page = makePage({
      waitForSelector: jest.fn().mockRejectedValue(new Error('timeout')),
    });
    const auth = new AuthHandler(BASE_CONFIG);
    const result = await auth.isLoggedIn(page);
    expect(result).toBe(false);
  });

  test('uses custom timeout in waitForSelector calls', async () => {
    const page = makePage();
    const auth = new AuthHandler({ ...BASE_CONFIG, timeout: 5000 });
    await auth.login(page, { username: 'u', password: 'p' });
    const timeouts = page.waitForSelector.mock.calls.map((c) => c[1]?.timeout);
    expect(timeouts).toContain(5000);
  });
});
