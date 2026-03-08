# LexNakamoto Frontend

Frontend for LexNakamoto escrow protocol.

## Clean Setup (No Local Devnet)

This frontend is configured to use **Stacks testnet API** by default.

### 1) Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 2) Environment

Configured in [frontend/.env.local](frontend/.env.local):

- `NEXT_PUBLIC_NETWORK=testnet`
- `NEXT_PUBLIC_STACKS_API_URL=https://api.testnet.hiro.so`
- `NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=<your deployed testnet address>`
- `NEXT_PUBLIC_ESCROW_CONTRACT_NAME=lex-nakamoto-escrow`

### 3) Deploy contract from API route

The deploy endpoint now uses:

- `clarinet deployments apply --testnet` (default)
- `clarinet deployments apply --mainnet` (if request body sets `network: "mainnet"`)

Before deploying, set a real mnemonic in [settings/Testnet.toml](../settings/Testnet.toml).

If mnemonic is still placeholder, deploy API returns a clear error.

## Notes

- Local `clarinet devnet start` is not required for frontend usage.
- After deployment, update `NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS` and restart `npm run dev`.
