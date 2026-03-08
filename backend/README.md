# LexNakamoto Backend

Express/TypeScript backend for:
- sponsored transaction signing + broadcast
- Nakamoto finality status tracking
- lean event indexing cache
- dispute case/evidence records
- notification fanout hooks

## Setup

1. Copy env file:

- from [backend/.env.example](.env.example) to `.env`

2. Install dependencies:

- `npm install`

3. Run dev server:

- `npm run dev`

## Endpoints

- `POST /api/sponsor`
  - body: `{ txHex: string, principal?: string }`
  - validates contract/function allowlist
  - applies sponsor signature
  - broadcasts to Stacks API

- `GET /api/escrow/status/:txid`
  - returns `pending | fast-path-secure | bitcoin-anchored-final | failed`
  - includes `is_unanchored`, `burn_block_height`, and canonical flags

- `POST /api/indexer/watch`
  - body: `{ txid: string, tag?: string }`
  - starts caching a tx status entry

- `GET /api/indexer/tx/:txid`
  - refreshes and returns one watched tx

- `GET /api/indexer/watched`
  - lists watched tx cache

- `POST /api/disputes`
  - body: `{ escrowId: number, openedBy: string, reason: string, txid?: string }`

- `POST /api/disputes/:id/evidence`
  - body: `{ kind: "url" | "note", content: string, submittedBy: string }`

- `PATCH /api/disputes/:id/status`
  - body: `{ status: "open" | "under-review" | "resolved", note?: string }`

- `GET /api/disputes` and `GET /api/disputes/:id`

- `POST /api/notifications/subscribers`
  - body: `{ channel: "webhook" | "email" | "telegram", target: string }`

- `POST /api/notifications/test`
  - body: `{ event?: string, payload?: object }`

- `GET /api/notifications/subscribers` and `GET /api/notifications/events`

- `GET /health`

## Security notes

- sponsor key must be testnet-funded and isolated
- in-memory rate limiter is enabled per IP and per principal (24h window)
- allowlisted function sponsorship only
- sponsor gas guardrails:
  - block sponsorship when balance is below `SPONSOR_MIN_STX` (default 10)
  - internal low-gas warning when below `SPONSOR_WARN_STX` (default 20)
- policy guardrails:
  - `SPONSOR_MAX_ESCROW_SATS`
  - `SPONSOR_ALLOWED_TOKEN_CONTRACTS` (comma-separated)
