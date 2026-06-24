# Teable Integrations

Official integrations that connect [Teable](https://teable.io) to third-party
automation platforms.

This repository is a **multi-package repo without a workspace**: every integration
under `packages/` is fully self-contained — it owns its dependencies, build, and
release, and deploys to its own platform independently. There is intentionally no
shared root workspace, so there is no dependency hoisting and no cross-package
coupling. Each package stays on its own platform's golden path.

## Packages

| Package | Platform | Status | Distribution |
| --- | --- | --- | --- |
| [`packages/zapier-teable`](./packages/zapier-teable) | [Zapier](https://zapier.com) | In development | `zapier push` (Zapier Platform CLI) |
| `packages/n8n-nodes-teable` | [n8n](https://n8n.io) | Planned | npm — `n8n-nodes-teable` |

## Layout

```
integrations/
  packages/
    zapier-teable/        # Zapier Platform CLI app
    n8n-nodes-teable/     # n8n community node (planned)
```

## Development

Each package is developed, versioned, and released on its own. See the README
inside each package for setup, testing, and deployment instructions.

## Secrets

Never commit credentials. Each package keeps secrets in a local, git-ignored
`.env` (copy it from `.env.example`). Platform deploy config — for example
Zapier's `.zapierapprc` — is git-ignored as well.
