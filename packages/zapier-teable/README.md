# Teable integration for Zapier

A [Zapier Platform CLI](https://docs.zapier.com/platform/build-cli/overview) app that
connects Teable records into Zapier. Modeled on Airtable's Zapier integration, but
points at **Teable's** API and adds an **instance URL** field (Teable is self-hostable).

## What's inside

| Type | Key | Teable API |
|---|---|---|
| Trigger | New Record | `GET /api/table/{tableId}/record` (polling, dedupe by `id`) |
| Trigger | New or Updated Record | same, dedupe by `id@lastModifiedTime` |
| Action | Create Record | `POST /api/table/{tableId}/record` |
| Action | Update Record | `PATCH /api/table/{tableId}/record/{recordId}` |
| Action | Create or Update Record | find via `GET …/record?filterByTql`, then `PATCH …/record/{id}` or `POST …/record` |
| Action | Delete Record | `DELETE /api/table/{tableId}/record/{recordId}` |
| Action | API Request (Beta) | raw authenticated HTTP to any Teable endpoint (Bearer token attached) |
| Search | Find Record | `GET …/record?filterByTql={Field} = "value"` |
| Search | Find Record by ID | `GET /api/table/{tableId}/record/{recordId}` |
| (hidden) | Bases / Tables / Fields | power the dropdowns |

Auth = **OAuth2** (`type: 'oauth2'`). The access token is sent as
`Authorization: Bearer <token>` on every request (attached by the
`beforeRequest` middleware). Tokens auto-refresh via the refresh token. The
connection label shows the account email, read from `GET /api/auth/user`.

## ⚠️ Triggers are polling, not real-time

Teable's public API exposes **no outbound webhook**, so triggers poll on Zapier's
schedule (1–15 min depending on plan). If Teable later ships an outbound webhook /
"record changed → POST" capability, these can be upgraded to instant triggers via
`performSubscribe`/`performUnsubscribe`.

## TypeScript & how the build is packaged

This app is written in **TypeScript** under `src/` and compiled to CommonJS in
`dist/` (the build output; git-ignored).

```bash
npm run build            # rimraf dist && tsc → dist/
```

⚠️ **The root `index.js` is load-bearing — keep it committed.** Zapier's
generated `zapierwrapper.js` loads the app from `path.resolve(__dirname,
'index.js')` at the package root — it **ignores `package.json` `main`**. So a tiny
committed shim re-exports the compiled app:

```js
// index.js
module.exports = require('./dist/index.js');
```

How the upload is assembled (important, and counter-intuitive):

- `zapier push` runs the `_zapier-build` hook (`npm run build`, i.e. `tsc`) to
  regenerate `dist/`, then builds `build.zip`.
- `build.zip` is **not** a copy of your files — it's whatever **esbuild traces as
  required, starting from the root `index.js`**. From `index.js` it follows
  `require('./dist/index.js')` and pulls in the whole compiled `dist/` tree.
- `dist/` being **git-ignored does not matter** for `build.zip`: the `.gitignore`
  filter (`respectGitIgnore`) only applies to `source.zip`, not to the
  esbuild-traced `build.zip`.

If the root `index.js` is missing, esbuild has nothing to trace, the upload ships
with no app code, and Zapier fails at runtime with
`Cannot find module '/var/task/index.js'` — which surfaces in the UI as a vague
**"Failed to start OAuth"** on connect. Diagnose with `zapier-platform logs -s error`.
(There is no need for an `includeInBuild` entry in `.zapierapprc` — the root
`index.js` trace already covers `dist/`.)

## Develop & publish

The CLI bin is **`zapier-platform`** (newer `zapier-platform-cli`). Install it
globally as `zapier` if you prefer (`npm i -g zapier-platform-cli`); the commands
below use `npx zapier-platform`.

```bash
cd packages/zapier-teable
npm install
npx zapier-platform login           # uses your Zapier account
npx zapier-platform push            # runs _zapier-build (tsc), then uploads build.zip
npx zapier-platform validate        # static schema checks
npx zapier-platform versions        # list deployed versions
npx zapier-platform logs -s error   # server-side runtime errors (invaluable)
```

The app is already registered (`.zapierapprc` holds its `id`/`key`), so **don't
re-run `register`** — just `push`.

### OAuth setup (server-side, per version)

Auth is OAuth2, so three env vars must be set **on each version** (env is
per-version on Zapier, and is injected into `process.env` at runtime — it is
**not** baked into the upload):

```bash
npx zapier-platform env:set <version> \
  TEABLE_INSTANCE_URL=https://your-teable.example.com \
  CLIENT_ID=<teable oauth app client id> \
  CLIENT_SECRET=<teable oauth app client secret>
```

In Teable → **Settings → OAuth Apps**, the app's allowed **redirect URI** must
include Zapier's callback (find the exact one via `npx zapier-platform describe`):

```
https://zapier.com/dashboard/auth/oauth/return/App<appId>/
```

and the app must grant the scopes the integration requests (see
`SCOPES` in `src/authentication.ts`). Then connect an account in the Zap editor.

## Testing

```bash
npm install
npm test                 # jest (ts-jest): unit tests always run; live tests skip without .env
npx zapier-platform validate   # static schema checks (needs zapier-platform-cli)
```

Tests are TypeScript (`test/*.test.ts`) and run through **ts-jest** (configured in
`jest.config.js`), so `npm test` type-checks and runs them without a separate build.

- **Unit tests** (`test/unit.test.ts`) — pure lib logic (URL building, flatten, field
  collection). No network, no credentials.
- **Live tests** (`auth`, `triggers`, `records`) — hit a real Teable instance via
  `createAppTester`. They **skip automatically** unless you provide credentials:

  ```bash
  cp .env.example .env     # then fill in instance URL, PAT, a scratch base/table
  npm test                 # now the live suites run too
  ```

  `test/records.test.ts` **writes** a record (create → find → update), so point
  `TEABLE_TABLE_ID` at a throwaway table.

## Known limits / TODO

- `typecast: true` on writes coerces strings into selects/dates like Airtable.
- Link/attachment/user fields are exposed as plain string inputs for v1 — they need
  typed handling (id arrays / upload flow) before they round-trip cleanly.
- `Find Record` matches on equality via TQL; add fuzzy/`search` param if needed.
