// ============================================================================
// EscrowCard — Full escrow detail card with actions
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { request } from "@stacks/connect";
import { useWallet } from "@/context/WalletContext";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import MilestoneTracker from "./MilestoneTracker";
import SafetyPreview from "./SafetyPreview";
import { satsToSbtc, VALID_MILESTONES } from "@/lib/constants";
import {
    buildReleaseMilestoneTxOptions,
    buildInitiateDisputeTxOptions,
    buildResolveDisputeTxOptions,
    buildReclaimExpiredTxOptions,
    buildPostConditionPreview,
    isMilestoneOverdue,
    getEscrowStatus,
    type EscrowData,
    type PostConditionPreview,
} from "@/lib/stacks-api";
import { showToast } from "./ToastNotification";

interface EscrowCardProps {
    escrow: EscrowData;
    onAction?: () => void;
}

export default function EscrowCard({ escrow, onAction }: EscrowCardProps) {
    const { address } = useWallet();
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [safetyPreview, setSafetyPreview] = useState<PostConditionPreview | null>(null);
    const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
    const [overdue, setOverdue] = useState(false);
    const [statusLabel, setStatusLabel] = useState<string | null>(null);

    // v3: Fetch on-chain status string + overdue flag
    useEffect(() => {
        let cancelled = false;
        async function fetchV3() {
            try {
                const [od, st] = await Promise.all([
                    isMilestoneOverdue(escrow.escrowId),
                    getEscrowStatus(escrow.escrowId),
                ]);
                if (!cancelled) { setOverdue(od); setStatusLabel(st); }
            } catch { /* API unavailable */ }
        }
        fetchV3();
        return () => { cancelled = true; };
    }, [escrow.escrowId, escrow.state]);

    const isBuyer = address === escrow.buyer;
    const isSeller = address === escrow.seller;
    const isArbiter = address === escrow.arbiter;
    const isActive = escrow.state === 1;
    const remaining = escrow.totalAmount - escrow.releasedAmount;

    /** Show SafetyPreview modal, then execute on confirm */
    const withSafetyPreview = (preview: PostConditionPreview, action: () => Promise<void>) => {
        setSafetyPreview(preview);
        setPendingAction(() => action);
    };

    const handleConfirmAction = async () => {
        setSafetyPreview(null);
        if (pendingAction) await pendingAction();
        setPendingAction(null);
    };

    const handleReleaseMilestone = async (pct: number) => {
        const releaseAmount = (escrow.totalAmount * BigInt(pct)) / 100n;
        const preview = buildPostConditionPreview(`Release ${pct}% Milestone`, {
            sender: "Escrow contract",
            receiver: escrow.seller,
            amount: releaseAmount,
            mode: "deny",
        });
        withSafetyPreview(preview, async () => {
            setLoading(true);
            try {
                const opts = buildReleaseMilestoneTxOptions(escrow.escrowId, pct);
                await request("stx_callContract", opts);
                showToast({ type: "success", title: "Milestone Released", message: `Released ${pct}% of escrow #${escrow.escrowId}` });
                onAction?.();
            } catch (err) {
                console.error("Release milestone failed:", err);
                showToast({ type: "error", title: "Release Failed", message: String(err) });
            } finally {
                setLoading(false);
            }
        });
    };

    const handleDispute = async () => {
        const preview = buildPostConditionPreview("Initiate Dispute", {
            sender: address ?? "You",
            receiver: "Escrow contract",
            amount: 0n,
            mode: "deny",
        });
        withSafetyPreview(preview, async () => {
            setLoading(true);
            try {
                const opts = buildInitiateDisputeTxOptions(escrow.escrowId);
                await request("stx_callContract", opts);
                showToast({ type: "pending", title: "Dispute Filed", message: `Dispute initiated for escrow #${escrow.escrowId}` });
                onAction?.();
            } catch (err) {
                console.error("Dispute failed:", err);
                showToast({ type: "error", title: "Dispute Failed", message: String(err) });
            } finally {
                setLoading(false);
            }
        });
    };

    const handleResolveDispute = async (pct: number) => {
        const preview = buildPostConditionPreview(`Resolve Dispute: ${pct}% to Seller`, {
            sender: "Arbiter",
            receiver: "Escrow contract",
            amount: 0n,
            mode: "allow", // Arbiter interactions might allow transfers depending on contract internals
        });

        withSafetyPreview(preview, async () => {
            setLoading(true);
            try {
                const opts = buildResolveDisputeTxOptions(escrow.escrowId, pct);
                await request("stx_callContract", opts);
                showToast({ type: "success", title: "Dispute Resolved", message: `Assigned ${pct}% to seller.` });
                onAction?.();
            } catch (err) {
                console.error("Resolve failed:", err);
                showToast({ type: "error", title: "Resolution Failed", message: String(err) });
            } finally {
                setLoading(false);
            }
        });
    };

    const handleReclaim = async () => {
        const preview = buildPostConditionPreview("Reclaim Expired Escrow", {
            sender: "Escrow contract",
            receiver: address ?? "Your wallet",
            amount: remaining,
            mode: "deny",
        });
        withSafetyPreview(preview, async () => {
            setLoading(true);
            try {
                const opts = buildReclaimExpiredTxOptions(escrow.escrowId);
                await request("stx_callContract", opts);
                showToast({ type: "success", title: "Funds Reclaimed", message: `Reclaimed ${satsToSbtc(remaining)} sBTC from escrow #${escrow.escrowId}` });
                onAction?.();
            } catch (err) {
                console.error("Reclaim failed:", err);
                showToast({ type: "error", title: "Reclaim Failed", message: String(err) });
            } finally {
                setLoading(false);
            }
        });
    };

    return (
        <GlassCard hover className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">
                            Escrow #{escrow.escrowId}
                        </h3>
                        <StatusBadge state={escrow.state} />
                    </div>
                    <p className="mt-1 text-sm text-white/40">
                        {isBuyer ? "You are the buyer" : isSeller ? "You are the seller" : "Observer"}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                        {satsToSbtc(escrow.totalAmount)}
                    </p>
                    <p className="text-xs text-orange-400/80">sBTC locked</p>
                </div>
            </div>

            {/* Milestone Tracker (replaces EscrowProgress) */}
            <div className="mt-6">
                <MilestoneTracker
                    escrowId={escrow.escrowId}
                    totalAmount={escrow.totalAmount}
                    releasedAmount={escrow.releasedAmount}
                    expiresAt={escrow.expiresAt}
                    state={escrow.state}
                />
            </div>

            {/* Expand / Collapse Details */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="mt-4 flex w-full items-center justify-center gap-1 text-xs text-white/30 transition-colors hover:text-white/60"
            >
                {expanded ? "Hide details" : "Show details"}
                <motion.svg
                    animate={{ rotate: expanded ? 180 : 0 }}
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
                            {/* v3: On-chain status via int-to-ascii */}
                            {statusLabel && (
                                <DetailRow label="On-chain status" value={statusLabel} />
                            )}
                            <DetailRow label="Buyer" value={truncateAddr(escrow.buyer)} />
                            <DetailRow label="Seller" value={truncateAddr(escrow.seller)} />
                            <DetailRow label="Arbiter" value={truncateAddr(escrow.arbiter)} />
                            <DetailRow label="Created at block" value={`#${escrow.createdAt}`} />
                            <DetailRow label="Expires at block" value={`#${escrow.expiresAt}`} />
                            {/* v3: creation-height helper fields */}
                            {escrow.tenureCreated > 0 && (
                                <DetailRow label="Tenure created" value={`#${escrow.tenureCreated}`} />
                            )}
                            {escrow.burnBlockCreated > 0 && (
                                <DetailRow label="Bitcoin block" value={`#${escrow.burnBlockCreated}`} />
                            )}
                            <DetailRow
                                label="Remaining"
                                value={`${satsToSbtc(remaining)} sBTC`}
                            />
                        </div>

                        {/* v3: Overdue warning */}
                        {overdue && (
                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                                <span>⚠️</span>
                                <span>This escrow is <strong>overdue</strong> — no milestone released in 30+ days.</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Actions */}
            {address && isActive && (
                <div className="mt-5 flex flex-wrap gap-2">
                    {isBuyer && (
                        <>
                            {VALID_MILESTONES.map((pct) => (
                                <ActionButton
                                    key={pct}
                                    label={`Release ${pct}%`}
                                    variant="primary"
                                    loading={loading}
                                    onClick={() => handleReleaseMilestone(pct)}
                                />
                            ))}
                            <ActionButton
                                label="Reclaim"
                                variant="danger"
                                loading={loading}
                                onClick={handleReclaim}
                            />
                        </>
                    )}
                    {(isBuyer || isSeller) && (
                        <ActionButton
                            label="Dispute"
                            variant="warning"
                            loading={loading}
                            onClick={handleDispute}
                        />
                    )}
                </div>
            )}

            {/* Arbiter Actions */}
            {address && isArbiter && escrow.state === 2 && (
                <div className="mt-5 flex flex-wrap gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="w-full mb-2 flex items-center gap-2 text-sm text-amber-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        <span className="font-semibold">Arbiter Resolution controls: Target % to Seller</span>
                    </div>
                    {([0, ...VALID_MILESTONES] as number[]).map((pct) => (
                        <ActionButton
                            key={`arb-${pct}`}
                            label={`${pct}% to Seller`}
                            variant={pct === 0 ? "danger" : pct === 100 ? "primary" : "warning"}
                            loading={loading}
                            onClick={() => handleResolveDispute(pct)}
                        />
                    ))}
                </div>
            )}

            {/* Safety Preview Modal */}
            <SafetyPreview
                isOpen={!!safetyPreview}
                preview={safetyPreview}
                onConfirm={handleConfirmAction}
                onCancel={() => { setSafetyPreview(null); setPendingAction(null); }}
                loading={loading}
            />
        </GlassCard>
    );
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <span className="text-white/40">{label}</span>
            <span className="font-mono text-white/70">{value}</span>
        </div>
    );
}

function ActionButton({
    label,
    variant,
    loading,
    onClick,
}: {
    label: string;
    variant: "primary" | "warning" | "danger";
    loading: boolean;
    onClick: () => void;
}) {
    const colors = {
        primary:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
        warning:
            "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
        danger:
            "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
            onClick={onClick}
            className={`
        rounded-lg border px-3 py-1.5 text-xs font-medium
        transition-colors disabled:opacity-40
        ${colors[variant]}
      `}
        >
            {loading ? "…" : label}
        </motion.button>
    );
}

function truncateAddr(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
