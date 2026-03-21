// ============================================================================
// LexNakamoto — Stacks Contract Interaction Service (v3)
// ============================================================================
// Typed helpers for every public & read-only function in
// lex-nakamoto-escrow.clar v3.
//
// v2: getBlocksUntilExpiry, getPendingArbiter, isTokenWhitelisted,
//     governance tx builders, getSbtcBalance, getBlockInfo, tx status polling.
// v3: getEscrowStatus (int-to-ascii), getEscrowAge,
//     isMilestoneOverdue, and getBitcoinFinality helper calls.
// ============================================================================

import {
  uintCV,
  principalCV,
  contractPrincipalCV,
  cvToJSON,
  fetchCallReadOnlyFunction,
  Pc,
  ClarityType,
  type ClarityValue,
} from "@stacks/transactions";
import {
  API_BASE,
  ACTIVE_SBTC_CONTRACT,
  CONTRACT_ADDRESS,
  ESCROW_CONTRACT_NAME,
  MOCK_SBTC_CONTRACT_NAME,
  ERROR_MESSAGES,
} from "./constants";

// ── Types ───────────────────────────────────────────────────────────────────

export interface EscrowData {
  escrowId: number;
  buyer: string;
  seller: string;
  tokenContract: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  state: number;
  createdAt: number;
  expiresAt: number;
  arbiter: string;
  tenureCreated: number;
  burnBlockCreated: number;
}

export interface BlockInfo {
  stacksBlockHeight: number;
  burnBlockHeight: number;
  tenureHeight: number;
  indexBlockHash: string;
}

export interface BitcoinFinalityData {
  createdBurnBlock: number;
  currentBurnBlock: number;
  confirmations: number;
}

export type TxFinalityStage =
  | "mempool-broadcast"
  | "stacks-fast-block"
  | "bitcoin-anchor"
  | "failed";

export interface TxProgress {
  txId: string;
  stage: TxFinalityStage;
  burnBlockHeight?: number;
  txStatus?: string;
}

// ── Post-Condition Preview (for SafetyPreview modal) ────────────────────────

export interface PostConditionPreview {
  action: string;
  sender: string;
  receiver: string;
  amount: bigint;
  token: string;
  mode: "deny" | "allow";
  humanDescription: string;
}

export function buildPostConditionPreview(
  action: string,
  opts: {
    sender?: string;
    receiver?: string;
    amount?: bigint;
    mode?: "deny" | "allow";
  },
): PostConditionPreview {
  return {
    action,
    sender: opts.sender ?? "Your wallet",
    receiver: opts.receiver ?? "Escrow contract",
    amount: opts.amount ?? 0n,
    token: "sBTC",
    mode: opts.mode ?? "deny",
    humanDescription:
      opts.mode === "deny"
        ? `Safe Mode: You are authorizing EXACTLY ${opts.amount?.toString() ?? "0"} sats of sBTC. This transaction will fail if the contract tries to take more.`
        : `This transaction allows the contract to send tokens. Post-conditions are enforced on-chain.`,
  };
}

// ── Read-Only Helpers ───────────────────────────────────────────────────────

async function callReadOnly(
  functionName: string,
  args: ClarityValue[] = [],
): Promise<ClarityValue> {
  return fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName,
    functionArgs: args,
    senderAddress: CONTRACT_ADDRESS,
    client: { baseUrl: API_BASE },
  });
}

/** Resolve BNS-like name (e.g. lex.btc) into a Stacks address. */
export async function resolveNameToAddress(nameOrAddress: string): Promise<string> {
  const raw = nameOrAddress.trim();
  if (/^S[PTMN][A-Z0-9]{20,60}$/i.test(raw)) return raw;

  const candidate = raw.toLowerCase();
  const res = await fetch(`${API_BASE}/v1/names/${candidate}`);
  if (!res.ok) throw new Error("Unable to resolve name");
  const data = await res.json();
  const address = data?.address;
  if (!address || !/^S[PTMN]/.test(address)) throw new Error("Name did not resolve to a valid address");
  return address;
}

/** Fetch a single escrow by ID. Returns null if not found. */
export async function getEscrow(escrowId: number): Promise<EscrowData | null> {
  try {
    const result = await callReadOnly("get-escrow", [uintCV(escrowId)]);
    const json = cvToJSON(result);
    if (!json || json.type === ClarityType.OptionalNone) return null;
    const v = json.value;
    return {
      escrowId,
      buyer: v.buyer.value,
      seller: v.seller.value,
      tokenContract: v["token-contract"].value,
      totalAmount: BigInt(v["total-amount"].value),
      releasedAmount: BigInt(v["released-amount"].value),
      state: Number(v.state.value),
      createdAt: Number(v["created-at"].value),
      expiresAt: Number(v["expires-at"].value),
      arbiter: v.arbiter.value,
      tenureCreated: Number(v["tenure-created"]?.value ?? 0),
      burnBlockCreated: Number(v["burn-block-created"]?.value ?? 0),
    };
  } catch {
    return null;
  }
}

/** Get the total number of escrows ever created. */
export async function getEscrowCount(): Promise<number> {
  const result = await callReadOnly("get-escrow-count");
  const json = cvToJSON(result);
  return Number(json.value.value ?? json.value);
}

/** Get remaining locked balance for an escrow. */
export async function getRemainingBalance(escrowId: number): Promise<bigint> {
  const result = await callReadOnly("get-remaining-balance", [uintCV(escrowId)]);
  const json = cvToJSON(result);
  return BigInt(json.value.value ?? 0);
}

/** Check if an escrow has expired. */
export async function isEscrowExpired(escrowId: number): Promise<boolean> {
  const result = await callReadOnly("is-escrow-expired", [uintCV(escrowId)]);
  const json = cvToJSON(result);
  return json.value.value === true;
}

/** Get blocks remaining until escrow expires. */
export async function getBlocksUntilExpiry(escrowId: number): Promise<number> {
  try {
    const result = await callReadOnly("get-blocks-until-expiry", [uintCV(escrowId)]);
    const json = cvToJSON(result);
    return Number(json.value.value ?? 0);
  } catch {
    return 0;
  }
}

/** Get the current platform arbiter. */
export async function getPlatformArbiter(): Promise<string> {
  const result = await callReadOnly("get-platform-arbiter");
  const json = cvToJSON(result);
  return json.value.value ?? "";
}

/** Get the pending arbiter nominee. */
export async function getPendingArbiter(): Promise<string | null> {
  try {
    const result = await callReadOnly("get-pending-arbiter");
    const json = cvToJSON(result);
    if (json.value.type === ClarityType.OptionalNone) return null;
    return json.value.value?.value ?? null;
  } catch {
    return null;
  }
}

/** Check if a token is whitelisted. */
export async function isTokenWhitelisted(tokenPrincipal: string): Promise<boolean> {
  try {
    const result = await callReadOnly("is-token-whitelisted", [principalCV(tokenPrincipal)]);
    const json = cvToJSON(result);
    return json.value.value === true;
  } catch {
    return false;
  }
}

// ── v3 Read-Only: Clarity 4 Features ────────────────────────────────────────

/** Get human-readable escrow status via int-to-ascii (v3). */
export async function getEscrowStatus(escrowId: number): Promise<string | null> {
  try {
    const result = await callReadOnly("get-escrow-status", [uintCV(escrowId)]);
    const json = cvToJSON(result);
    return json.value?.value ?? null;
  } catch {
    return null;
  }
}

/** Get escrow age from the contract's stored creation-height helper. */
export async function getEscrowAge(escrowId: number): Promise<number> {
  try {
    const result = await callReadOnly("get-escrow-age", [uintCV(escrowId)]);
    const json = cvToJSON(result);
    return Number(json.value?.value ?? 0);
  } catch {
    return 0;
  }
}

/** Check if escrow is overdue (> 30 days in tenure blocks) (v3). */
export async function isMilestoneOverdue(escrowId: number): Promise<boolean> {
  try {
    const result = await callReadOnly("is-milestone-overdue", [uintCV(escrowId)]);
    const json = cvToJSON(result);
    return json.value?.value === true;
  } catch {
    return false;
  }
}

/** Get Bitcoin finality data: burn-block at creation, current, confirmations (v3). */
export async function getBitcoinFinality(escrowId: number): Promise<BitcoinFinalityData | null> {
  try {
    const result = await callReadOnly("get-bitcoin-finality", [uintCV(escrowId)]);
    const json = cvToJSON(result);
    const v = json.value?.value;
    if (!v) return null;
    return {
      createdBurnBlock: Number(v["created-burn-block"]?.value ?? 0),
      currentBurnBlock: Number(v["current-burn-block"]?.value ?? 0),
      confirmations: Number(v.confirmations?.value ?? 0),
    };
  } catch {
    return null;
  }
}

/** Batch-fetch all escrows (0 … count-1). */
export async function getAllEscrows(): Promise<EscrowData[]> {
  const count = await getEscrowCount();
  const promises = Array.from({ length: count }, (_, i) => getEscrow(i));
  const results = await Promise.all(promises);
  return results.filter((e): e is EscrowData => e !== null);
}

// ── Contract ID (template literal for @stacks/connect v8) ───────────────────
const ESCROW_CONTRACT_ID = `${CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}` as const;

// ── Transaction Builders ────────────────────────────────────────────────────

export function buildCreateEscrowTxOptions(
  senderAddress: string,
  seller: string,
  amount: bigint,
  lockPeriod: number = 2016,
  sponsor?: { sponsorAddress: string; fee?: number },
) {
  const [tokenAddr, tokenName] = ACTIVE_SBTC_CONTRACT.split(".");
  const postConditions = [
    Pc.principal(senderAddress)
      .willSendLte(amount)
      .ft(ACTIVE_SBTC_CONTRACT as `${string}.${string}`, "sbtc"),
  ];
  const tx = {
    contract: ESCROW_CONTRACT_ID,
    functionName: "create-escrow",
    functionArgs: [
      principalCV(seller),
      uintCV(amount),
      uintCV(lockPeriod),
      contractPrincipalCV(tokenAddr, tokenName),
    ],
    postConditionMode: "deny" as const,
    postConditions,
    network: "testnet" as const,
  };

  if (!sponsor) return tx;
  return {
    ...tx,
    sponsored: true,
    sponsorAddress: sponsor.sponsorAddress,
    ...(sponsor.fee ? { fee: sponsor.fee } : {}),
  };
}

export function buildReleaseMilestoneTxOptions(escrowId: number, milestonePct: number) {
  const [tokenAddr, tokenName] = ACTIVE_SBTC_CONTRACT.split(".");
  return {
    contract: ESCROW_CONTRACT_ID,
    functionName: "release-milestone",
    functionArgs: [
      uintCV(escrowId),
      uintCV(milestonePct),
      contractPrincipalCV(tokenAddr, tokenName),
    ],
    postConditionMode: "allow" as const,
    network: "testnet" as const,
  };
}

export function buildInitiateDisputeTxOptions(escrowId: number) {
  return {
    contract: ESCROW_CONTRACT_ID,
    functionName: "initiate-dispute",
    functionArgs: [uintCV(escrowId)],
    postConditionMode: "deny" as const,
    postConditions: [],
    network: "testnet" as const,
  };
}

export function buildResolveDisputeTxOptions(escrowId: number, releasePct: number) {
  const [tokenAddr, tokenName] = ACTIVE_SBTC_CONTRACT.split(".");
  return {
    contract: ESCROW_CONTRACT_ID,
    functionName: "resolve-dispute",
    functionArgs: [
      uintCV(escrowId),
      uintCV(releasePct),
      contractPrincipalCV(tokenAddr, tokenName),
    ],
    postConditionMode: "allow" as const,
    network: "testnet" as const,
  };
}

export function buildReclaimExpiredTxOptions(escrowId: number) {
  const [tokenAddr, tokenName] = ACTIVE_SBTC_CONTRACT.split(".");
  return {
    contract: ESCROW_CONTRACT_ID,
    functionName: "reclaim-expired",
    functionArgs: [
      uintCV(escrowId),
      contractPrincipalCV(tokenAddr, tokenName),
    ],
    postConditionMode: "allow" as const,
    network: "testnet" as const,
  };
}

export function buildClawbackOverdueTxOptions(escrowId: number) {
  const [tokenAddr, tokenName] = ACTIVE_SBTC_CONTRACT.split(".");
  return {
    contract: ESCROW_CONTRACT_ID,
    functionName: "clawback-overdue",
    functionArgs: [
      uintCV(escrowId),
      contractPrincipalCV(tokenAddr, tokenName),
    ],
    postConditionMode: "allow" as const,
    network: "testnet" as const,
  };
}

export function buildNominateArbiterTxOptions(newArbiter: string) {
  return {
    contract: ESCROW_CONTRACT_ID,
    functionName: "nominate-arbiter",
    functionArgs: [principalCV(newArbiter)],
    postConditionMode: "deny" as const,
    postConditions: [],
    network: "testnet" as const,
  };
}

export function buildAcceptArbiterTxOptions() {
  return {
    contract: ESCROW_CONTRACT_ID,
    functionName: "accept-arbiter",
    functionArgs: [],
    postConditionMode: "deny" as const,
    postConditions: [],
    network: "testnet" as const,
  };
}

export function buildWhitelistTokenTxOptions() {
  return {
    contract: ESCROW_CONTRACT_ID,
    functionName: "whitelist-token",
    functionArgs: [contractPrincipalCV(CONTRACT_ADDRESS, MOCK_SBTC_CONTRACT_NAME)],
    postConditionMode: "deny" as const,
    postConditions: [],
    network: "testnet" as const,
  };
}

const MOCK_SBTC_CONTRACT_ID = `${CONTRACT_ADDRESS}.${MOCK_SBTC_CONTRACT_NAME}` as const;

export function buildAuthorizeRecipientTxOptions(recipient: string) {
  const recipientArg = recipient.includes(".")
    ? contractPrincipalCV(recipient.split(".")[0], recipient.split(".")[1])
    : principalCV(recipient);

  return {
    contract: MOCK_SBTC_CONTRACT_ID,
    functionName: "authorize-recipient",
    functionArgs: [recipientArg],
    postConditionMode: "deny" as const,
    postConditions: [],
    network: "testnet" as const,
  };
}

export function buildMintMockSbtcTxOptions(recipient: string, amount: bigint) {
  return {
    contract: MOCK_SBTC_CONTRACT_ID,
    functionName: "mint",
    functionArgs: [uintCV(amount), principalCV(recipient)],
    postConditionMode: "deny" as const,
    postConditions: [],
    network: "testnet" as const,
  };
}

// ── Balance Helpers ─────────────────────────────────────────────────────────

export async function getSbtcBalance(address: string): Promise<bigint> {
  try {
    const contractId = `${CONTRACT_ADDRESS}.${MOCK_SBTC_CONTRACT_NAME}`;
    const res = await fetch(`${API_BASE}/extended/v1/address/${address}/balances`);
    if (!res.ok) return 0n;
    const data = await res.json();
    const ftBalances = data.fungible_tokens ?? {};
    const sbtcKey = Object.keys(ftBalances).find((k) => k.startsWith(contractId));
    if (!sbtcKey) return 0n;
    return BigInt(ftBalances[sbtcKey].balance ?? 0);
  } catch {
    return 0n;
  }
}

export async function getStxBalance(address: string): Promise<bigint> {
  try {
    const res = await fetch(`${API_BASE}/extended/v1/address/${address}/stx`);
    if (!res.ok) return 0n;
    const data = await res.json();
    return BigInt(data.balance ?? 0);
  } catch {
    return 0n;
  }
}

/** Fetch the escrow contract's locked sBTC balance (on-chain). */
export async function getContractSbtcBalance(): Promise<bigint> {
  return getSbtcBalance(`${CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}`);
}

// ── Nakamoto Block & Tenure Info ────────────────────────────────────────────

export async function getBlockInfo(): Promise<BlockInfo | null> {
  try {
    const res = await fetch(`${API_BASE}/v2/info`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      stacksBlockHeight: data.stacks_tip_height ?? 0,
      burnBlockHeight: data.burn_block_height ?? 0,
      tenureHeight: data.tenure_height ?? data.stacks_tip_height ?? 0,
      indexBlockHash: data.stacks_tip ?? "",
    };
  } catch {
    return null;
  }
}

// ── Explorer / Transaction Helpers ──────────────────────────────────────────

export interface ContractEvent {
  txId: string;
  eventType: string;
  data: Record<string, unknown>;
  blockHeight: number;
  timestamp: number;
}

export async function getContractEvents(limit = 20): Promise<ContractEvent[]> {
  try {
    const res = await fetch(
      `${API_BASE}/extended/v1/contract/${CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}/events?limit=${limit}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events ?? []).map((e: Record<string, unknown>) => ({
      txId: e.tx_id,
      eventType: e.event_type ?? "unknown",
      data: e,
      blockHeight: e.block_height ?? 0,
      timestamp: 0,
    }));
  } catch {
    return [];
  }
}

export async function getAddressTransactions(
  address: string,
  limit = 20,
): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(
      `${API_BASE}/extended/v1/address/${address}/transactions?limit=${limit}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function getTransactionStatus(
  txId: string,
): Promise<"pending" | "success" | "failed" | "unknown"> {
  try {
    const res = await fetch(`${API_BASE}/extended/v1/tx/${txId}`);
    if (!res.ok) return "unknown";
    const data = await res.json();
    if (data.tx_status === "success") return "success";
    if (data.tx_status === "pending" || data.tx_status === "submitted") return "pending";
    if (data.tx_status?.startsWith("abort")) return "failed";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/** Track transaction progress through mempool -> fast block -> Bitcoin anchor. */
export async function getTransactionProgress(txId: string): Promise<TxProgress> {
  try {
    const res = await fetch(`${API_BASE}/extended/v1/tx/${txId}`);
    if (!res.ok) return { txId, stage: "mempool-broadcast" };
    const data = await res.json();
    const status = String(data?.tx_status ?? "");

    if (status.startsWith("abort")) return { txId, stage: "failed", txStatus: status };
    if (status === "pending" || status === "submitted") {
      return { txId, stage: "mempool-broadcast", txStatus: status };
    }

    const burnHeight = Number(data?.burn_block_height ?? 0);
    if (burnHeight > 0) {
      return {
        txId,
        stage: "bitcoin-anchor",
        burnBlockHeight: burnHeight,
        txStatus: status,
      };
    }

    return { txId, stage: "stacks-fast-block", txStatus: status };
  } catch {
    return { txId, stage: "mempool-broadcast" };
  }
}

// ── Error Decoder ───────────────────────────────────────────────────────────

export function decodeContractError(errorCode: number): string {
  return ERROR_MESSAGES[errorCode] ?? `Unknown error (u${errorCode})`;
}
