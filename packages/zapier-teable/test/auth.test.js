'use strict';

const { App, appTester, authData, describeLive } = require('./helpers');

// Live test: exercises authentication.test against a real Teable instance.
// Skipped automatically when no .env credentials are present.
describeLive('authentication', () => {
  it('passes the connection test (GET /auth/user/me) with a valid token', async () => {
    const response = await appTester(App.authentication.test, { authData: authData() });
    // Returns the current user — shape varies, just assert it resolved.
    expect(response).toBeDefined();
  });

  it('rejects a bad token', async () => {
    const bad = { authData: { access_token: 'definitely-not-valid' } };
    await expect(appTester(App.authentication.test, bad)).rejects.toThrow();
  });
});
