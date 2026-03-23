// ============================================================================
// LexNakamoto — Contract Constants & Network Config (v3)
// ============================================================================

// ── Network ─────────────────────────────────────────────────────────────────
export const NETWORK = (
  process.env.NEXT_PUBLIC_NETWORK ??
  process.env.NEXT_PUBLIC_STACKS_NETWORK ??
  "testnet"
) as "mainnet" | "testnet" | "devnet";

export const EXPLORER_BASE =
  NETWORK === "mainnet"
    ? "https://explorer.hiro.so"
    : "https://explorer.hiro.so/?chain=testnet";

export const API_BASE =
  process.env.NEXT_PUBLIC_STACKS_API_URL ??
  (NETWORK === "mainnet"
    ? "https://api.hiro.so"
    : NETWORK === "testnet"
      ? "https://api.testnet.hiro.so"
      : "http://localhost:3999");

// ── Contract Identity ───────────────────────────────────────────────────────
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS ??
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

export const ESCROW_CONTRACT_NAME =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_NAME ?? "lex-nakamoto-escrow";
export const MOCK_SBTC_CONTRACT_NAME =
  process.env.NEXT_PUBLIC_MOCK_SBTC_CONTRACT_NAME ?? "mock-sbtc";
export const SIP010_TRAIT_NAME = "sip-010-ft-standard";

export const ESCROW_CONTRACT_ID = `${CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}`;
export const MOCK_SBTC_CONTRACT_ID = `${CONTRACT_ADDRESS}.${MOCK_SBTC_CONTRACT_NAME}`;

// ── Official sBTC Addresses ─────────────────────────────────────────────────
export const SBTC_CONTRACT: Record<string, string> = {
  mainnet: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
  testnet: `${CONTRACT_ADDRESS}.${MOCK_SBTC_CONTRACT_NAME}`,
  devnet: `${CONTRACT_ADDRESS}.${MOCK_SBTC_CONTRACT_NAME}`,
};

export const ACTIVE_SBTC_CONTRACT =
  process.env.NEXT_PUBLIC_SBTC_CONTRACT ?? SBTC_CONTRACT[NETWORK];

// ── Escrow States ───────────────────────────────────────────────────────────
export const ESCROW_STATES: Record<number, string> = {
  1: "Active",
  2: "Disputed",
  3: "Completed",
  4: "Refunded",
};

export const STATE_COLORS: Record<number, string> = {
  1: "text-emerald-400",
  2: "text-amber-400",
  3: "text-blue-400",
  4: "text-rose-400",
};

export const STATE_BG_COLORS: Record<number, string> = {
  1: "bg-emerald-500/20 border-emerald-500/30",
  2: "bg-amber-500/20 border-amber-500/30",
  3: "bg-blue-500/20 border-blue-500/30",
  4: "bg-rose-500/20 border-rose-500/30",
};

// ── Milestones ──────────────────────────────────────────────────────────────
export const VALID_MILESTONES = [25, 50, 100] as const;

// ── sBTC Decimals ───────────────────────────────────────────────────────────
export const SBTC_DECIMALS = 8;

export function satsToSbtc(sats: number | bigint): string {
  const n = typeof sats === "bigint" ? sats : BigInt(sats);
  const whole = n / BigInt(10 ** SBTC_DECIMALS);
  const frac = n % BigInt(10 ** SBTC_DECIMALS);
  const fracStr = frac.toString().padStart(SBTC_DECIMALS, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function sbtcToSats(sbtc: string): bigint {
  const [whole = "0", frac = ""] = sbtc.split(".");
  const paddedFrac = frac.padEnd(SBTC_DECIMALS, "0").slice(0, SBTC_DECIMALS);
  return BigInt(whole) * BigInt(10 ** SBTC_DECIMALS) + BigInt(paddedFrac);
}

// ── Default Lock Period ─────────────────────────────────────────────────────
export const DEFAULT_LOCK_PERIOD = 2016;
export const BLOCK_TIME_SECONDS = 600;
export const THIRTY_DAYS_IN_BLOCKS = 4320; // 30 days * 144 tenure blocks/day

// ── Wallet Provider IDs ─────────────────────────────────────────────────────
export const WALLET_PROVIDERS = {
  leather: { name: "Leather", icon: "🟠", color: "from-orange-500 to-orange-600" },
  xverse: { name: "Xverse", icon: "🟣", color: "from-purple-500 to-purple-600" },
  okx: { name: "OKX", icon: "⚫", color: "from-gray-600 to-gray-700" },
  unknown: { name: "Stacks Wallet", icon: "⚡", color: "from-orange-500 to-amber-500" },
} as const;

export type WalletProviderId = keyof typeof WALLET_PROVIDERS;

// ── Error Codes ─────────────────────────────────────────────────────────────
export const ERROR_MESSAGES: Record<number, string> = {
  1000: "Not authorized to perform this action",
  1001: "Escrow not found",
  1002: "Escrow already exists",
  1003: "Invalid amount",
  1004: "Invalid milestone percentage (use 25, 50, or 100)",
  1005: "Escrow is not active",
  1006: "Escrow is in dispute",
  1007: "Escrow is already completed",
  1008: "Milestone exceeds total escrow amount",
  1009: "Token transfer failed",
  1010: "Escrow has expired",
  1011: "Escrow has not expired yet",
  1012: "Escrow is not in dispute",
  1013: "Cannot escrow with yourself",
  1014: "Invalid resolution percentage",
  1015: "No pending arbiter nomination",
  1016: "You are not the nominated arbiter",
  1017: "Token is not whitelisted for escrow use",
  1018: "Milestone is not yet overdue (30-day threshold not reached)",
};
