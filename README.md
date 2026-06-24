# Teable Integrations

Official integrations that connect [Teable](https://teable.io) to third-party automation platforms.

Each integration is a self-contained package under `packages/`, built and released independently.

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
