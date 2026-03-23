// ============================================================================
// SafetyPreview — Post-Condition Visualization Modal
// ============================================================================
// Shows a human-readable summary of post-conditions before the user signs.
// "Safe Mode: You are authorizing EXACTLY [amount] sBTC."
// ============================================================================

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { satsToSbtc } from "@/lib/constants";
import type { PostConditionPreview } from "@/lib/stacks-api";

interface SafetyPreviewProps {
    isOpen: boolean;
    preview: PostConditionPreview | null;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

export default function SafetyPreview({
    isOpen,
    preview,
    onConfirm,
    onCancel,
    loading = false,
}: SafetyPreviewProps) {
    if (!preview) return null;

    const isDeny = preview.mode === "deny";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/[0.08] bg-gray-900/95 p-6 shadow-2xl backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDeny
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "bg-amber-500/20 text-amber-400"
                                    }`}
                            >
                                {isDeny ? (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                ) : (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">
                                    Transaction Safety Preview
                                </h3>
                                <p className="text-sm text-white/40">{preview.action}</p>
                            </div>
                        </div>

                        {/* Safety Info */}
                        <div
                            className={`mt-5 rounded-xl border p-4 ${isDeny
                                    ? "border-emerald-500/20 bg-emerald-500/5"
                                    : "border-amber-500/20 bg-amber-500/5"
                                }`}
                        >
                            <div className="flex items-start gap-2">
                                <span className="mt-0.5 text-lg">
                                    {isDeny ? "🛡️" : "⚠️"}
                                </span>
                                <p
                                    className={`text-sm leading-relaxed ${isDeny ? "text-emerald-300/90" : "text-amber-300/90"
                                        }`}
                                >
                                    {preview.humanDescription}
                                </p>
                            </div>
                        </div>

                        {/* Transaction Details */}
                        <div className="mt-4 space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/40">From</span>
                                <span className="font-mono text-white/70">
                                    {preview.sender.length > 20
                                        ? `${preview.sender.slice(0, 8)}…${preview.sender.slice(-6)}`
                                        : preview.sender}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/40">To</span>
                                <span className="font-mono text-white/70">
                                    {preview.receiver.length > 20
                                        ? `${preview.receiver.slice(0, 8)}…${preview.receiver.slice(-6)}`
                                        : preview.receiver}
                                </span>
                            </div>
                            {preview.amount > 0n && (
                                <div className="flex justify-between">
                                    <span className="text-white/40">Amount</span>
                                    <span className="font-mono font-semibold text-orange-400">
                                        {satsToSbtc(preview.amount)} {preview.token}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-white/40">Mode</span>
                                <span
                                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${isDeny
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : "bg-amber-500/20 text-amber-400"
                                        }`}
                                >
                                    {isDeny ? "STRICT (Deny)" : "ALLOW"}
                                </span>
                            </div>
                        </div>

                        {/* Post-condition explanation */}
                        <p className="mt-3 text-center text-xs text-white/30">
                            Post-conditions are enforced by the Stacks blockchain.
                            {isDeny && " The transaction will be rejected if limits are exceeded."}
                        </p>

                        {/* Actions */}
                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08]"
                            >
                                Cancel
                            </button>
                            <motion.button
                                type="button"
                                data-tour="tour-confirm-tx"
                                onClick={onConfirm}
                                disabled={loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition-shadow disabled:opacity-40 ${isDeny
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25 hover:shadow-emerald-500/40"
                                        : "bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/25 hover:shadow-orange-500/40"
                                    }`}
                            >
                                {loading ? "Signing…" : "Sign & Submit"}
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
