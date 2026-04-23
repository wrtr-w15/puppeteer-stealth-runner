class AuthHandler {
  constructor({
    loginUrl,
    usernameSelector,
    passwordSelector,
    submitSelector = null,
    successSelector,
    timeout = 10000,
  }) {
    this.loginUrl = loginUrl;
    this.usernameSelector = usernameSelector;
    this.passwordSelector = passwordSelector;
    this.submitSelector = submitSelector;
    this.successSelector = successSelector;
    this.timeout = timeout;
  }

  async login(page, { username, password }) {
    await page.goto(this.loginUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(this.usernameSelector, { timeout: this.timeout });
    await page.type(this.usernameSelector, username);
    await page.waitForSelector(this.passwordSelector, { timeout: this.timeout });
    await page.type(this.passwordSelector, password);
    if (this.submitSelector) {
      await page.waitForSelector(this.submitSelector, { timeout: this.timeout });
      await page.click(this.submitSelector);
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForSelector(this.successSelector, { timeout: this.timeout });
  }

  async isLoggedIn(page) {
    try {
      await page.waitForSelector(this.successSelector, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { AuthHandler };
