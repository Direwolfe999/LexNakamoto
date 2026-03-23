// ============================================================================
// Dashboard — Main escrow management view
// ============================================================================

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { request } from "@stacks/connect";
import { useWallet } from "@/context/WalletContext";
import EscrowCard from "@/components/EscrowCard";
import CreateEscrowModal from "@/components/CreateEscrowModal";
import TransactionFeed from "@/components/TransactionFeed";
import StatsBar from "@/components/StatsBar";
import GlassCard from "@/components/GlassCard";
import SponsorPolicyPanel from "@/components/SponsorPolicyPanel";
import type { SponsorPolicyPayload } from "@/components/SponsorPolicyPanel";
import BitcoinFinalityTracker from "@/components/BitcoinFinalityTracker";
import { dismissToast, showToast } from "@/components/ToastNotification";
import { CONTRACT_ADDRESS, ESCROW_CONTRACT_NAME } from "@/lib/constants";
import {
    buildAuthorizeRecipientTxOptions,
    buildMintMockSbtcTxOptions,
    buildWhitelistTokenTxOptions,
    getAllEscrows,
    getEscrowCount,
    type EscrowData,
} from "@/lib/stacks-api";

export default function DashboardPage() {
    const { address, isWalletConnected, sbtcBalance, refreshBalance } =
        useWallet();
    const [escrows, setEscrows] = useState<EscrowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [filter, setFilter] = useState<"all" | "buyer" | "seller" | "arbiter">("all");
    const [contractExists, setContractExists] = useState(true);
    const [deploying, setDeploying] = useState(false);
    const [bootstrapping, setBootstrapping] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [sponsorPolicy, setSponsorPolicy] =
        useState<SponsorPolicyPayload | null>(null);
    const [policyLoading, setPolicyLoading] = useState(true);
    const deployHelperEnabled = process.env.NEXT_PUBLIC_ENABLE_LOCAL_DEPLOY_API === "true";

    // Check contract existence on load
    const checkContract = useCallback(async () => {
        try {
            // Try to call a read-only function; if it fails, contract is missing
            await getEscrowCount();
            setContractExists(true);
            setErrorMessage(null);
        } catch {
            setContractExists(false);
            setErrorMessage("Could not find contract on the current network.");
        }
    }, []);

    const fetchEscrows = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllEscrows();
            setEscrows(data);
            setErrorMessage(null);
        } catch (err) {
            console.error("Failed to fetch escrows:", err);
            setErrorMessage("Unable to load escrows right now. Please retry.");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSponsorPolicy = useCallback(async () => {
        setPolicyLoading(true);
        try {
            const q = address ? `?principal=${encodeURIComponent(address)}` : "";
            const r = await fetch(`/api/sponsor-policy${q}`);
            const payload = await r.json().catch(() => ({}));
            if (!r.ok)
                throw new Error(payload?.error ?? "Failed to load sponsor policy");
            setSponsorPolicy(payload);
        } catch {
            setSponsorPolicy(null);
        } finally {
            setPolicyLoading(false);
        }
    }, [address]);

    const deployContracts = useCallback(async () => {
        if (!deployHelperEnabled) {
            showToast({
                type: "info",
                title: "Local deploy helper disabled",
                message:
                    "Use Clarinet or CI to deploy the contract, then point this app at the deployed address.",
            });
            return;
        }

        if (contractExists) {
            showToast({
                type: "info",
                title: "Already deployed",
                message: "Contracts are already available on testnet.",
            });
            return;
        }

        setDeploying(true);
        setErrorMessage(null);

        const toastId = showToast({
            type: "pending",
            title: "Deploying contracts",
            message: "Submitting deployment to testnet...",
        });

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60_000);
            const res = await fetch("/api/deploy", {
                method: "POST",
                signal: controller.signal,
            });
            clearTimeout(timeout);
            const payload = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg = payload?.error ?? payload?.stderr ?? "Deployment failed";
                throw new Error(msg);
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
            await checkContract();
            await fetchEscrows();

            showToast({
                type: "success",
                title: payload?.alreadyDeployed
                    ? "Already deployed"
                    : "Deployment complete",
                message: payload?.message ?? "Contracts are available on testnet.",
            });
        } catch (err) {
            const msg =
                err instanceof Error && err.name === "AbortError"
                    ? "Deployment check timed out. Please retry."
                    : err instanceof Error
                        ? err.message
                        : "Deployment failed";
            setErrorMessage(msg);
            showToast({
                type: "error",
                title: "Deployment failed",
                message: msg,
            });
        } finally {
            dismissToast(toastId);
            setDeploying(false);
        }
    }, [checkContract, contractExists, deployHelperEnabled, fetchEscrows]);

    const bootstrapTestnet = useCallback(async () => {
        if (!address) {
            showToast({
                type: "error",
                title: "Wallet required",
                message: "Connect wallet first.",
            });
            return;
        }

        if (address !== CONTRACT_ADDRESS) {
            showToast({
                type: "error",
                title: "Use deployer wallet",
                message: `Connect deployer wallet (${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(-4)}) to bootstrap token permissions.`,
            });
            return;
        }

        setBootstrapping(true);
        setErrorMessage(null);
        const pendingId = showToast({
            type: "pending",
            title: "Bootstrapping testnet",
            message: "Authorize recipients, whitelist token, and mint mock sBTC.",
        });

        try {
            const escrowPrincipal = `${CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}`;

            await request(
                "stx_callContract",
                buildAuthorizeRecipientTxOptions(address),
            );
            await request(
                "stx_callContract",
                buildAuthorizeRecipientTxOptions(escrowPrincipal),
            );
            await request("stx_callContract", buildWhitelistTokenTxOptions());
            await request(
                "stx_callContract",
                buildMintMockSbtcTxOptions(address, 100_000_000n),
            ); // 1.0 sBTC

            await refreshBalance();
            await fetchEscrows();

            showToast({
                type: "success",
                title: "Bootstrap complete",
                message: "You now have mock sBTC and can create escrows.",
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Bootstrap failed";
            setErrorMessage(msg);
            showToast({ type: "error", title: "Bootstrap failed", message: msg });
        } finally {
            dismissToast(pendingId);
            setBootstrapping(false);
        }
    }, [address, fetchEscrows, refreshBalance]);

    useEffect(() => {
        checkContract();
        fetchEscrows();
        fetchSponsorPolicy();
        const interval = setInterval(() => {
            checkContract();
            fetchEscrows();
            fetchSponsorPolicy();
        }, 30_000); // 30s real-time sync
        return () => clearInterval(interval);
    }, [checkContract, fetchEscrows, fetchSponsorPolicy]);

    // Filter escrows based on connected wallet
    const filtered = escrows.filter((e) => {
        if (!address || filter === "all") return true;
        if (filter === "buyer") return e.buyer === address;
        if (filter === "seller") return e.seller === address;
        if (filter === "arbiter") return e.arbiter === address;
        return true;
    });

    return (
        <div className="space-y-8">
            {/* Contract existence check and deploy prompt */}
            {!contractExists && (
                <GlassCard className="p-6 text-center">
                    <h3 className="text-xl font-bold text-orange-400 mb-2">
                        Contract Not Found
                    </h3>
                    <p className="text-white/70 mb-4">
                        The escrow contract is not deployed on this network.
                        <br />
                        {deployHelperEnabled
                            ? "Use the local developer helper below to deploy it to testnet."
                            : "Deploy it with Clarinet or CI, then update the frontend contract address for this environment."}
                    </p>
                    {deployHelperEnabled ? (
                        <button
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-shadow hover:shadow-orange-500/40"
                            disabled={deploying}
                            onClick={deployContracts}
                        >
                            {deploying ? "Deploying..." : "Deploy to Testnet"}
                        </button>
                    ) : (
                        <p className="text-xs text-white/35">
                            Browser-triggered deployment is disabled in hosted builds.
                        </p>
                    )}
                </GlassCard>
            )}

            {errorMessage && (
                <GlassCard className="border border-rose-500/30 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-rose-300">{errorMessage}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    checkContract();
                                    fetchEscrows();
                                }}
                                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white"
                            >
                                Retry
                            </button>
                            {deployHelperEnabled && (
                                <button
                                    onClick={deployContracts}
                                    disabled={deploying}
                                    className="rounded-lg bg-orange-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500 disabled:opacity-60"
                                >
                                    {deploying
                                        ? "Deploying..."
                                        : contractExists
                                            ? "Deployed ✓"
                                            : "Deploy"}
                                </button>
                            )}
                        </div>
                    </div>
                </GlassCard>
            )}

            {isWalletConnected && sbtcBalance === "0" && (
                <GlassCard className="border border-blue-500/30 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-blue-200">
                            Smart setup tip: your wallet has 0 mock sBTC. Deploy is done, but
                            you still need token bootstrap (authorize recipients + mint +
                            whitelist token) before creating escrow.
                        </p>
                        <button
                            onClick={bootstrapTestnet}
                            disabled={bootstrapping}
                            className="rounded-lg bg-blue-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                        >
                            {bootstrapping ? "Bootstrapping..." : "Bootstrap Testnet"}
                        </button>
                    </div>
                </GlassCard>
            )}

            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
                <div>
                    <h2 data-tour="tour-welcome" className="text-3xl font-bold text-white">Dashboard</h2>
                    <p className="mt-1 text-sm text-white/40">
                        Manage your milestone-based sBTC escrows
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:mb-0 mb-2">
                    {deployHelperEnabled && (
                        <button
                            onClick={deployContracts}
                            disabled={deploying}
                            className={`inline-flex items-center rounded-xl border px-4 py-2 text-xs font-medium disabled:opacity-60 ${contractExists
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                : "border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
                                }`}
                        >
                            {deploying
                                ? "Deploying..."
                                : contractExists
                                    ? "Deployed ✓"
                                    : "Deploy/Repair"}
                        </button>
                    )}
                    {isWalletConnected && contractExists && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowCreate(true)}
                            className="
              inline-flex items-center gap-2 rounded-xl
              bg-gradient-to-r from-orange-500 to-amber-500
              px-6 py-3 text-sm font-semibold text-white
              shadow-lg shadow-orange-500/25
              transition-shadow hover:shadow-orange-500/40
            "
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                            New Escrow
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {/* Stats */}
            <StatsBar escrows={escrows} />

            {/* Sponsor policy rule opener */}
            <SponsorPolicyPanel payload={sponsorPolicy} loading={policyLoading} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                {/* Escrow List — 2/3 width */}
                <div data-tour="tour-escrow-list" className="space-y-6 xl:col-span-2">
                    {/* Filter tabs */}
                    {isWalletConnected && contractExists && (
                        <div className="flex flex-wrap gap-2">
                            {(["all", "buyer", "seller", "arbiter"] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`
                    rounded-lg px-4 py-2 text-xs font-medium capitalize
                    transition-colors
                    ${filter === f
                                            ? "bg-white/[0.1] text-white"
                                            : "text-white/30 hover:text-white/60"
                                        }
                  `}
                                >
                                    {f === "all" ? "All Escrows" : `As ${f}`}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Escrow Cards */}
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-64 animate-pulse rounded-2xl bg-white/[0.04]"
                                />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <GlassCard className="p-12 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] text-3xl">
                                📭
                            </div>
                            <h3 className="text-lg font-semibold text-white/60">
                                No escrows found
                            </h3>
                            <p className="mt-2 text-sm text-white/30">
                                {isWalletConnected
                                    ? "Create your first escrow to get started"
                                    : "Connect your wallet to see your escrows"}
                            </p>
                            {isWalletConnected && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowCreate(true)}
                                    className="
                    mt-6 inline-flex items-center gap-2 rounded-xl
                    bg-gradient-to-r from-orange-500 to-amber-500
                    px-6 py-2.5 text-sm font-semibold text-white
                    shadow-lg shadow-orange-500/25
                  "
                                >
                                    Create Escrow
                                </motion.button>
                            )}
                        </GlassCard>
                    ) : (
                        <div className="space-y-4">
                            {filtered.map((escrow) => (
                                <EscrowCard
                                    key={escrow.escrowId}
                                    escrow={escrow}
                                    onAction={fetchEscrows}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Activity Feed + Finality — 1/3 width */}
                <div className="space-y-6">
                    <BitcoinFinalityTracker />
                    <TransactionFeed />
                </div>
            </div>

            {/* Create Modal */}
            <CreateEscrowModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={fetchEscrows}
            />
        </div>
    );
}
