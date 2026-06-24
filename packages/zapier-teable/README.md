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
| Search | Find Record | `GET …/record?filterByTql={Field} = "value"` |
| (hidden) | Bases / Tables / Fields | power the dropdowns |

Auth = **Personal Access Token** sent as `Authorization: Bearer <token>`.

## ⚠️ Triggers are polling, not real-time

Teable's public API exposes **no outbound webhook**, so triggers poll on Zapier's
schedule (1–15 min depending on plan). If Teable later ships an outbound webhook /
"record changed → POST" capability, these can be upgraded to instant triggers via
`performSubscribe`/`performUnsubscribe`.

## Develop & publish

```bash
cd integrations/zapier-teable
npm install
zapier login            # uses your Zapier account
zapier register "Teable"  # first time only — creates the app
zapier push             # uploads this code (needs your deploy key)
zapier validate         # static checks
```

Then test in the Zap editor with a Teable instance URL + a Personal Access Token
(Teable → **Settings → Personal access tokens**).

## Testing

```bash
npm install
npm test                 # jest: unit tests always run; live tests skip without .env
npx zapier validate      # static schema checks (needs zapier-platform-cli)
```

- **Unit tests** (`test/unit.test.js`) — pure lib logic (URL building, flatten, field
  collection). No network, no credentials.
- **Live tests** (`auth`, `triggers`, `records`) — hit a real Teable instance via
  `createAppTester`. They **skip automatically** unless you provide credentials:

  ```bash
  cp .env.example .env     # then fill in instance URL, PAT, a scratch base/table
  npm test                 # now the live suites run too
  ```

  `test/records.test.js` **writes** a record (create → find → update), so point
  `TEABLE_TABLE_ID` at a throwaway table.

## Known limits / TODO

- `typecast: true` on writes coerces strings into selects/dates like Airtable.
- Link/attachment/user fields are exposed as plain string inputs for v1 — they need
  typed handling (id arrays / upload flow) before they round-trip cleanly.
- `Find Record` matches on equality via TQL; add fuzzy/`search` param if needed.
