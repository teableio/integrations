# n8n-nodes-teable

An [n8n](https://n8n.io) community node for [Teable](https://teable.io) — create,
read, update and delete records in a Teable base.

Teable is self-hostable, so the **instance URL lives on the credential**: each
connection points at its own Teable (cloud `https://app.teable.io` or your own
host).

## Installation

Community nodes → install `n8n-nodes-teable` (n8n **Settings → Community Nodes**),
or for self-hosted: `npm install n8n-nodes-teable` in your n8n custom nodes dir.

## Credentials

**Teable API** (Personal Access Token):

- **Instance URL** — origin of your Teable, no trailing slash / no `/api`
  (e.g. `https://app.teable.io`).
- **Access Token** — Teable → **Settings → Personal access tokens**. Sent as a
  Bearer token. The "Test" button calls `GET /api/auth/user`.

## Operations

**Record**

| Operation | API |
| --- | --- |
| Get Many | `GET /api/table/{tableId}/record` |
| Get | `GET /api/table/{tableId}/record/{recordId}` |
| Create | `POST /api/table/{tableId}/record` |
| Update | `PATCH /api/table/{tableId}/record/{recordId}` |
| Delete | `DELETE /api/table/{tableId}/record/{recordId}` |

Base and Table are dynamic dropdowns. Create/Update take a **Fields (JSON)**
object (`{"Name":"Acme"}`); values are typecast like the Teable UI.

## Develop

```bash
npm install
npm run build      # tsc → dist/, then copies icons
```

Link into a local n8n to test:

```bash
npm link
cd ~/.n8n/custom && npm link n8n-nodes-teable   # then restart n8n
```

## Roadmap

- Polling trigger (new / updated record)
- Per-field inputs (resource mapper) instead of raw JSON
- Attachment field support
- OAuth2 credential option
