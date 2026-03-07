// ============================================================================
// CreateEscrowModal — Glassmorphism modal for creating a new escrow
// ============================================================================

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useEscrow } from "@/context/EscrowContext";
import {
    buildPostConditionPreview,
    resolveNameToAddress,
    type PostConditionPreview,
} from "@/lib/stacks-api";
import { sbtcToSats } from "@/lib/constants";
import { useSponsoredEscrow } from "@/hooks/useSponsoredEscrow";
import SafetyPreview from "./SafetyPreview";
import { showToast } from "./ToastNotification";

interface CreateEscrowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function CreateEscrowModal({
    isOpen,
    onClose,
    onSuccess,
}: CreateEscrowModalProps) {
    const router = useRouter();
    const { address } = useWallet();
    const { startOptimisticEscrow, markEscrowSubmitted, markEscrowFailed } = useEscrow();
    const [seller, setSeller] = useState("");
    const [amount, setAmount] = useState("");
    const [lockPeriod, setLockPeriod] = useState("2016");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [safetyPreview, setSafetyPreview] = useState<PostConditionPreview | null>(null);
    const [resolvedSeller, setResolvedSeller] = useState<string | null>(null);
    const { createEscrowSponsored, state: sponsoredState, statusMessage } = useSponsoredEscrow();

    const amountSats = amount ? sbtcToSats(amount) : 0n;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address) return;
        setError(null);

        try {
            const sellerAddress = await resolveNameToAddress(seller);
            setResolvedSeller(sellerAddress);
            if (amountSats <= 0n) {
                throw new Error("Amount must be greater than 0");
            }
            if (sellerAddress === address) {
                throw new Error("Cannot create an escrow with yourself");
            }

            // Show SafetyPreview before signing
            const preview = buildPostConditionPreview("Create Escrow", {
                sender: address,
                receiver: "Escrow contract",
                amount: amountSats,
                mode: "deny",
            });
            setSafetyPreview(preview);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Validation failed");
        }
    };

    const handleConfirmCreate = async () => {
        if (!address || !resolvedSeller) return;
        setSafetyPreview(null);
        setLoading(true);

        let optimisticId: string | null = null;
        try {
            optimisticId = startOptimisticEscrow(resolvedSeller, amountSats);

            const { txId, mode } = await createEscrowSponsored({
                seller: resolvedSeller,
                amountSats,
                lockPeriod: parseInt(lockPeriod) || 2016,
                principal: address,
            });

            if (txId) {
                markEscrowSubmitted(optimisticId, txId);
                showToast({
                    type: "info",
                    title: "Transaction Secure (Fast Block)",
                    message: "Optimistic state applied while waiting for Bitcoin anchor.",
                    txId,
                });
            }

            showToast({
                type: "success",
                title: mode === "sponsored" ? "Escrow Created (Gasless)" : "Escrow Created",
                message: "Escrow Created! Redirecting to Bitcoin Finality Tracker...",
            });
            onSuccess?.();
            onClose();
            setSeller("");
            setAmount("");
            setLockPeriod("2016");
            setResolvedSeller(null);
            router.push(`/escrow-status/${txId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Transaction failed");
            if (optimisticId) markEscrowFailed(optimisticId);
            showToast({ type: "error", title: "Creation Failed", message: err instanceof Error ? err.message : "Transaction failed" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="
              fixed left-1/2 top-1/2 z-50 w-full max-w-lg
              -translate-x-1/2 -translate-y-1/2
              rounded-2xl border border-white/[0.08]
              bg-gray-900/90 p-8 shadow-2xl backdrop-blur-xl
            "
                    >
                        <h2 className="text-xl font-bold text-white">Create New Escrow</h2>
                        <p className="mt-1 text-sm text-white/40">
                            Lock sBTC in a milestone-based escrow contract
                        </p>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                            {/* Seller */}
                            <div>
                                <label className="text-sm font-medium text-white/60">
                                    Seller Address
                                </label>
                                <input
                                    type="text"
                                    value={seller}
                                    onChange={(e) => setSeller(e.target.value)}
                                    placeholder="SP2… or ST2…"
                                    required
                                    className="
                    mt-1.5 w-full rounded-xl border border-white/[0.08]
                    bg-white/[0.04] px-4 py-3 text-sm text-white
                    placeholder-white/20 outline-none
                    transition-colors focus:border-orange-500/40
                  "
                                />
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="text-sm font-medium text-white/60">
                                    Amount (sBTC)
                                </label>
                                <input
                                    type="text"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.01"
                                    required
                                    className="
                    mt-1.5 w-full rounded-xl border border-white/[0.08]
                    bg-white/[0.04] px-4 py-3 text-sm text-white
                    placeholder-white/20 outline-none
                    transition-colors focus:border-orange-500/40
                  "
                                />
                                {amountSats > 0n && (
                                    <p className="mt-1 text-xs text-white/30">
                                        = {amountSats.toString()} sats
                                    </p>
                                )}
                            </div>

                            {/* Lock Period */}
                            <div>
                                <label className="text-sm font-medium text-white/60">
                                    Lock Period (blocks)
                                </label>
                                <input
                                    type="number"
                                    value={lockPeriod}
                                    onChange={(e) => setLockPeriod(e.target.value)}
                                    placeholder="2016"
                                    className="
                    mt-1.5 w-full rounded-xl border border-white/[0.08]
                    bg-white/[0.04] px-4 py-3 text-sm text-white
                    placeholder-white/20 outline-none
                    transition-colors focus:border-orange-500/40
                  "
                                />
                                <p className="mt-1 text-xs text-white/30">
                                    Default: 2016 blocks ≈ 14 days
                                </p>
                            </div>

                            {/* Post-condition notice */}
                            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                                <p className="text-xs text-orange-400/80">
                                    🔒 <strong>Post-Condition:</strong> This transaction will only
                                    transfer exactly{" "}
                                    <span className="font-mono">{amount || "0"} sBTC</span> from
                                    your wallet to the escrow contract.
                                </p>
                            </div>

                            {/* Error */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {statusMessage && (
                                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-300">
                                    {statusMessage}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="
                    flex-1 rounded-xl border border-white/[0.08]
                    bg-white/[0.04] py-3 text-sm font-medium text-white/60
                    transition-colors hover:bg-white/[0.08]
                  "
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    type="submit"
                                    disabled={loading || !address}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="
                    flex-1 rounded-xl bg-gradient-to-r
                    from-orange-500 to-amber-500
                    py-3 text-sm font-semibold text-white
                    shadow-lg shadow-orange-500/25
                    transition-shadow hover:shadow-orange-500/40
                    disabled:opacity-40
                  "
                                >
                                    {loading
                                        ? sponsoredState === "sponsoring"
                                            ? "Sponsoring…"
                                            : "Signing…"
                                        : "Create Escrow"}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>

                    {/* Safety Preview Modal */}
                    <SafetyPreview
                        isOpen={!!safetyPreview}
                        preview={safetyPreview}
                        onConfirm={handleConfirmCreate}
                        onCancel={() => setSafetyPreview(null)}
                        loading={loading}
                    />
                </>
            )}
        </AnimatePresence>
    );
}
