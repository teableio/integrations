'use strict';

const zapier = require('zapier-platform-core');
const App = require('../index');

// Load .env into process.env for the live tests (no-op if .env is absent).
zapier.tools.env.inject();

const appTester = zapier.createAppTester(App);

// authData as Zapier would pass it after an OAuth connection is set up. For live
// tests, paste a valid access token (or a PAT — both are Bearer) in .env.
const authData = () => ({
  access_token: process.env.TEABLE_ACCESS_TOKEN,
});

// True only when enough env is present to talk to a real Teable instance.
const hasCreds = () => Boolean(process.env.TEABLE_INSTANCE_URL && process.env.TEABLE_ACCESS_TOKEN);
const hasTable = () => hasCreds() && Boolean(process.env.TEABLE_TABLE_ID);

// describeLive(...) runs the block only with creds; otherwise it's skipped (not
// failed), so `npm test` stays green on a machine with no .env.
const describeLive = (name, fn) => (hasCreds() ? describe(name, fn) : describe.skip(name, fn));
const describeTable = (name, fn) => (hasTable() ? describe(name, fn) : describe.skip(name, fn));

module.exports = { zapier, App, appTester, authData, hasCreds, hasTable, describeLive, describeTable };
