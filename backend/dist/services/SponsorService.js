import { broadcastTransaction, deserializeTransaction, getAddressFromPrivateKey, sponsorTransaction, } from "@stacks/transactions";
const CONTRACT_CALL_PAYLOAD = 2;
export class SponsorService {
    apiBase;
    sponsorPrivateKey;
    sponsorAddress;
    contractAddress;
    contractName;
    maxPerDay;
    maxEscrowSats;
    allowedTokenContracts;
    minSponsorBalanceMicroStx;
    lowGasWarningMicroStx;
    cooldownSeconds;
    lastSponsoredByPrincipal = new Map();
    windows = new Map();
    allowedFunctions = new Set([
        "create-escrow",
        "release-milestone",
        "initiate-dispute",
    ]);
    constructor() {
        this.apiBase = process.env.STACKS_API_BASE ?? "https://api.testnet.hiro.so";
        this.sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY ?? "";
        this.contractAddress = process.env.ESCROW_CONTRACT_ADDRESS ?? "";
        this.contractName = process.env.ESCROW_CONTRACT_NAME ?? "lex-nakamoto-escrow";
        this.maxPerDay = Number(process.env.SPONSOR_MAX_TX_PER_DAY ?? 2);
        this.maxEscrowSats = BigInt(process.env.SPONSOR_MAX_ESCROW_SATS ?? "100000000");
        this.minSponsorBalanceMicroStx = this.stxToMicroStx(process.env.SPONSOR_MIN_STX ?? "10");
        this.lowGasWarningMicroStx = this.stxToMicroStx(process.env.SPONSOR_WARN_STX ?? "20");
        this.cooldownSeconds = Number(process.env.SPONSOR_COOLDOWN_SECONDS ?? 120);
        const allowlist = (process.env.SPONSOR_ALLOWED_TOKEN_CONTRACTS ?? `${this.contractAddress}.mock-sbtc`)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        this.allowedTokenContracts = new Set(allowlist);
        if (!this.sponsorPrivateKey)
            throw new Error("SPONSOR_PRIVATE_KEY is required");
        if (!this.contractAddress)
            throw new Error("ESCROW_CONTRACT_ADDRESS is required");
        this.sponsorAddress = getAddressFromPrivateKey(this.sponsorPrivateKey, "testnet");
    }
    async sponsorAndBroadcast(input) {
        this.enforceCooldown(input.principal);
        this.enforceRateLimit(input.ip, input.principal);
        await this.ensureSponsorGasSafety();
        const tx = this.deserialize(input.txHex);
        const details = this.extractContractCallDetails(tx);
        if (details.contractAddress !== this.contractAddress || details.contractName !== this.contractName) {
            throw new Error("Contract call is not authorized for sponsorship");
        }
        if (!this.allowedFunctions.has(details.functionName)) {
            throw new Error(`Function ${details.functionName} is not sponsor-allowlisted`);
        }
        this.enforceFunctionPolicies(details.functionName, details.functionArgs);
        const sponsored = await sponsorTransaction({
            transaction: tx,
            sponsorPrivateKey: this.sponsorPrivateKey,
            client: { baseUrl: this.apiBase },
        });
        const result = await broadcastTransaction({
            transaction: sponsored,
            client: { baseUrl: this.apiBase },
        });
        if ("error" in result) {
            throw new Error(`${result.error}: ${result.reason ?? "broadcast failed"}`);
        }
        if (input.principal) {
            this.lastSponsoredByPrincipal.set(input.principal, Date.now());
        }
        return {
            txid: result.txid,
            sponsoredTxHex: Buffer.from(sponsored.serialize()).toString("hex"),
        };
    }
    async getPolicySummary() {
        const balance = await this.getSponsorStxBalance();
        const lowGasWarning = balance < this.lowGasWarningMicroStx;
        const canSponsorNow = balance >= this.minSponsorBalanceMicroStx;
        return {
            rules: {
                allowedFunctions: Array.from(this.allowedFunctions.values()),
                allowedTokenContracts: Array.from(this.allowedTokenContracts.values()),
                maxEscrowSats: this.maxEscrowSats.toString(),
                maxPerDay: this.maxPerDay,
                cooldownSeconds: this.cooldownSeconds,
                minSponsorStx: this.microStxToStx(this.minSponsorBalanceMicroStx),
                warningSponsorStx: this.microStxToStx(this.lowGasWarningMicroStx),
            },
            sponsor: {
                address: this.sponsorAddress,
                balanceStx: this.microStxToStx(balance),
                lowGasWarning,
                canSponsorNow,
            },
        };
    }
    async evaluatePolicy(input) {
        const reasons = [];
        const fn = input.functionName ?? "create-escrow";
        const amount = input.amountSats ? BigInt(input.amountSats) : undefined;
        const token = input.tokenContract;
        const now = Date.now();
        const balance = await this.getSponsorStxBalance();
        if (balance < this.minSponsorBalanceMicroStx) {
            reasons.push("Sponsor gas wallet is below minimum STX threshold");
        }
        if (!this.allowedFunctions.has(fn)) {
            reasons.push(`Function ${fn} is not allowlisted for sponsorship`);
        }
        if (typeof amount === "bigint" && amount > this.maxEscrowSats) {
            reasons.push(`Escrow amount exceeds sponsor limit (${this.maxEscrowSats} sats)`);
        }
        if (token && !this.allowedTokenContracts.has(token)) {
            reasons.push("Token contract is not allowlisted for sponsorship");
        }
        if (input.principal) {
            const cooldownMessage = this.getCooldownFailureReason(input.principal, now);
            if (cooldownMessage)
                reasons.push(cooldownMessage);
            const principalKey = `principal:${input.principal}`;
            const existing = this.windows.get(principalKey);
            if (existing && now <= existing.resetAt && existing.count >= this.maxPerDay) {
                reasons.push("Principal reached 24h sponsored transaction limit");
            }
        }
        return {
            eligible: reasons.length === 0,
            reasons,
            principal: input.principal,
        };
    }
    deserialize(txHex) {
        const clean = txHex.startsWith("0x") ? txHex.slice(2) : txHex;
        return deserializeTransaction(clean);
    }
    extractContractCallDetails(tx) {
        const payload = tx.payload;
        if (payload?.payloadType !== CONTRACT_CALL_PAYLOAD) {
            throw new Error("Only contract-call transactions can be sponsored");
        }
        const functionName = payload?.functionName?.content ?? payload?.functionName?.toString?.();
        const contractName = payload?.contractName?.content ?? payload?.contractName?.toString?.();
        const contractAddress = payload?.contractAddress?.address ?? payload?.contractAddress?.toString?.();
        const functionArgs = Array.isArray(payload?.functionArgs) ? payload.functionArgs : [];
        if (!functionName || !contractName || !contractAddress) {
            throw new Error("Invalid contract-call payload");
        }
        return { functionName, contractName, contractAddress, functionArgs };
    }
    enforceFunctionPolicies(functionName, functionArgs) {
        if (functionName !== "create-escrow")
            return;
        const amountCv = functionArgs[1];
        const tokenCv = functionArgs[3];
        const escrowAmount = this.extractUint(amountCv);
        const tokenContract = this.extractContractPrincipal(tokenCv);
        if (escrowAmount === null) {
            throw new Error("Could not validate escrow amount from contract args");
        }
        if (escrowAmount > this.maxEscrowSats) {
            throw new Error(`Escrow amount exceeds sponsor policy limit (${escrowAmount} > ${this.maxEscrowSats} sats)`);
        }
        if (!tokenContract || !this.allowedTokenContracts.has(tokenContract)) {
            throw new Error("Token contract is not sponsor-allowlisted");
        }
    }
    enforceRateLimit(ip, principal) {
        const now = Date.now();
        const keys = [
            `ip:${ip || "unknown"}`,
            principal ? `principal:${principal}` : "principal:unknown",
        ];
        for (const key of keys) {
            const existing = this.windows.get(key);
            if (!existing || now > existing.resetAt) {
                this.windows.set(key, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
                continue;
            }
            if (existing.count >= this.maxPerDay) {
                throw new Error("Sponsor rate limit exceeded for 24h window");
            }
            existing.count += 1;
            this.windows.set(key, existing);
        }
    }
    enforceCooldown(principal) {
        if (!principal)
            return;
        const now = Date.now();
        const reason = this.getCooldownFailureReason(principal, now);
        if (reason) {
            throw new Error(reason);
        }
    }
    getCooldownFailureReason(principal, now) {
        const last = this.lastSponsoredByPrincipal.get(principal);
        if (!last)
            return null;
        const elapsedMs = now - last;
        const minGapMs = this.cooldownSeconds * 1000;
        if (elapsedMs < minGapMs) {
            const retryIn = Math.ceil((minGapMs - elapsedMs) / 1000);
            return `Cooldown active for ${principal}. Retry in ${retryIn}s`;
        }
        return null;
    }
    async ensureSponsorGasSafety() {
        const balance = await this.getSponsorStxBalance();
        if (balance < this.lowGasWarningMicroStx) {
            console.warn(`[Low Gas Warning] sponsor=${this.sponsorAddress} balance=${this.microStxToStx(balance)} STX. Top up from faucet soon.`);
        }
        if (balance < this.minSponsorBalanceMicroStx) {
            throw new Error(`Sponsor wallet balance too low (${this.microStxToStx(balance)} STX). Minimum required: ${this.microStxToStx(this.minSponsorBalanceMicroStx)} STX`);
        }
    }
    async getSponsorStxBalance() {
        const res = await fetch(`${this.apiBase}/extended/v1/address/${this.sponsorAddress}/balances`);
        if (!res.ok) {
            throw new Error("Failed to fetch sponsor wallet balance");
        }
        const payload = (await res.json());
        const raw = payload?.stx?.balance ?? "0";
        return BigInt(raw);
    }
    microStxToStx(microStx) {
        const whole = microStx / 1000000n;
        const fraction = (microStx % 1000000n).toString().padStart(6, "0").replace(/0+$/, "");
        return fraction ? `${whole}.${fraction}` : whole.toString();
    }
    stxToMicroStx(stx) {
        const [whole = "0", fraction = ""] = stx.trim().split(".");
        const frac = fraction.padEnd(6, "0").slice(0, 6);
        return BigInt(whole || "0") * 1000000n + BigInt(frac || "0");
    }
    extractUint(cv) {
        if (!cv)
            return null;
        if (typeof cv.value === "bigint")
            return cv.value;
        if (typeof cv.value === "number")
            return BigInt(cv.value);
        if (typeof cv.value === "string")
            return BigInt(cv.value);
        return null;
    }
    extractContractPrincipal(cv) {
        if (!cv)
            return null;
        const address = cv?.value?.address?.address ?? cv?.value?.address;
        const name = cv?.value?.contractName?.content ?? cv?.value?.contractName;
        if (address && name)
            return `${address}.${name}`;
        const str = cv?.value?.toString?.() ?? cv?.toString?.();
        return typeof str === "string" && str.includes(".") ? str.replace(/^'|"|"$/g, "") : null;
    }
}
