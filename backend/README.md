# LexNakamoto Backend

Optional Express/TypeScript backend for the LexNakamoto demo.

## What it does

- sponsors an allowlisted set of contract calls
- checks transaction settlement status
- caches watched transaction statuses
- stores lightweight dispute records and evidence
- exposes simple notification subscriber endpoints

## Important limitation

This backend is demo-grade today:

- watched transaction cache is in memory
- dispute records are in memory
- some rate-limit state is in memory
- sponsor flow requires a private key in server env

That makes it suitable for a demo deployment, but not durable production infrastructure without persistent storage and operational hardening.

## Setup

```bash
npm install
npm run dev
```

Use `backend/.env.example` as the starting point for server env values.

## Scripts

- `npm run dev`
- `npm run build`
- `npm start`

## Hosting

Render, Railway, or Fly.io are better fits than Vercel for this backend because the service holds private server secrets and keeps some live in-memory state.
