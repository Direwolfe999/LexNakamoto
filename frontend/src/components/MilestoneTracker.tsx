// ============================================================================
// MilestoneTracker — Visual progress bar updated from live contract data
// ============================================================================
// Shows milestone progression with animated markers and time-lock countdown.
// Fetches blocks-until-expiry for auto-refund time-lock display.
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { satsToSbtc, BLOCK_TIME_SECONDS } from "@/lib/constants";
import { getBlocksUntilExpiry } from "@/lib/stacks-api";

interface MilestoneTrackerProps {
    escrowId: number;
    totalAmount: bigint;
    releasedAmount: bigint;
    expiresAt: number;
    state: number;
}

const MILESTONES = [
    { pct: 25, label: "25%", color: "bg-blue-400" },
    { pct: 50, label: "50%", color: "bg-indigo-400" },
    { pct: 75, label: "75%", color: "bg-purple-400" },
    { pct: 100, label: "100%", color: "bg-emerald-400" },
];

export default function MilestoneTracker({
    escrowId,
    totalAmount,
    releasedAmount,
    state,
}: MilestoneTrackerProps) {
    const [blocksRemaining, setBlocksRemaining] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function fetch() {
            try {
                const blocks = await getBlocksUntilExpiry(escrowId);
                if (!cancelled) setBlocksRemaining(blocks);
            } catch {
                // API unavailable
            }
        }
        if (state === 1) fetch(); // Only track active escrows
        const interval = setInterval(fetch, 60_000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [escrowId, state]);

    const pct = totalAmount > 0n ? Number((releasedAmount * 100n) / totalAmount) : 0;
    const remaining = totalAmount - releasedAmount;

    const barGradient =
        state === 2
            ? "from-amber-500 to-amber-400"
            : state >= 3
                ? "from-blue-500 to-blue-400"
                : "from-emerald-500 via-teal-400 to-emerald-300";

    function formatTimeRemaining(blocks: number): string {
        const totalSeconds = blocks * BLOCK_TIME_SECONDS;
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        if (days > 0) return `${days}d ${hours}h`;
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-1">
                <span className="text-white/60">Milestone Progress</span>
                <span className="font-mono text-white/90">
                    {satsToSbtc(releasedAmount)} / {satsToSbtc(totalAmount)} sBTC
                </span>
            </div>

            {/* Track */}
            <div className="relative">
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 backdrop-blur-sm">
                    <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${barGradient} shadow-lg`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                </div>

                {/* Milestone markers */}
                <div className="absolute inset-0 flex items-center">
                    {MILESTONES.map((m) => {
                        const reached = pct >= m.pct;
                        return (
                            <div
                                key={m.pct}
                                className="absolute flex flex-col items-center"
                                style={{ left: `${m.pct}%`, transform: "translateX(-50%)" }}
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: m.pct * 0.01, type: "spring" }}
                                    className={`mt-6 h-3 w-3 rounded-full border-2 transition-all ${reached
                                            ? `${m.color} border-white/40 shadow-lg`
                                            : "border-white/15 bg-white/5"
                                        }`}
                                />
                                <span
                                    className={`mt-1 text-[10px] font-semibold ${reached ? "text-white/90" : "text-white/25"
                                        }`}
                                >
                                    {m.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 text-xs gap-1">
                <span className="text-white/40">
                    Released: <span className="text-white/60">{pct}%</span>
                </span>
                <span className="text-white/40">
                    Remaining: <span className="text-white/60">{satsToSbtc(remaining)} sBTC</span>
                </span>
            </div>

            {/* Time-lock countdown */}
            {state === 1 && blocksRemaining !== null && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className={`rounded-lg border p-3 ${blocksRemaining === 0
                            ? "border-rose-500/20 bg-rose-500/5"
                            : "border-orange-500/20 bg-orange-500/5"
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-sm">⏰</span>
                        <div>
                            <p className={`text-xs font-medium ${blocksRemaining === 0 ? "text-rose-400" : "text-orange-400"
                                }`}>
                                {blocksRemaining === 0
                                    ? "Time-Lock Expired — Auto-Refund Available"
                                    : `Auto-Refund in ${formatTimeRemaining(blocksRemaining)} (~${blocksRemaining} blocks)`}
                            </p>
                            <p className="mt-0.5 text-[10px] text-white/30">
                                SIP-033 time-lock: buyer can reclaim if milestones not met
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
