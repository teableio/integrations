import * as zapier from 'zapier-platform-core';
import App from '../src';

// Load .env into process.env for the live tests (no-op if .env is absent).
zapier.tools.env.inject();

const appTester = zapier.createAppTester(App);

// authData as Zapier would pass it after an OAuth connection is set up. For live
// tests, paste a valid access token (or a PAT — both are Bearer) in .env.
const authData = (): { access_token: string | undefined } => ({
  access_token: process.env.TEABLE_ACCESS_TOKEN,
});

// True only when enough env is present to talk to a real Teable instance.
const hasCreds = (): boolean =>
  Boolean(process.env.TEABLE_INSTANCE_URL && process.env.TEABLE_ACCESS_TOKEN);
const hasTable = (): boolean => hasCreds() && Boolean(process.env.TEABLE_TABLE_ID);

// describeLive(...) runs the block only with creds; otherwise it's skipped (not
// failed), so `npm test` stays green on a machine with no .env.
const describeLive = (name: string, fn: () => void): void =>
  hasCreds() ? describe(name, fn) : describe.skip(name, fn);
const describeTable = (name: string, fn: () => void): void =>
  hasTable() ? describe(name, fn) : describe.skip(name, fn);

export { zapier, App, appTester, authData, hasCreds, hasTable, describeLive, describeTable };
