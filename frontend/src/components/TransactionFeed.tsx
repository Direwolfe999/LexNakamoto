// ============================================================================
// TransactionFeed — Live activity feed from the Stacks Explorer API
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";
import { getContractEvents, type ContractEvent } from "@/lib/stacks-api";
import { EXPLORER_BASE } from "@/lib/constants";

export default function TransactionFeed() {
    const [events, setEvents] = useState<ContractEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function fetch() {
            try {
                const data = await getContractEvents(15);
                if (!cancelled) setEvents(data);
            } catch {
                // API might be unavailable in devnet
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetch();
        const interval = setInterval(fetch, 30_000); // Refresh every 30s
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    return (
        <GlassCard className="p-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
                <span className="flex items-center gap-1.5 text-xs text-white/30">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    Live
                </span>
            </div>

            <div className="mt-4 space-y-3">
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-14 animate-pulse rounded-xl bg-white/[0.04]"
                            />
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                        <p className="text-sm text-white/30">No contract events yet</p>
                        <p className="mt-1 text-xs text-white/20">
                            Events will appear here when the contract is used on-chain
                        </p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {events.map((event, i) => (
                            <motion.a
                                key={`${event.txId}-${i}`}
                                href={`${EXPLORER_BASE}/txid/${event.txId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="
                  flex items-center justify-between rounded-xl
                  border border-white/[0.06] bg-white/[0.02] p-3
                  transition-colors hover:bg-white/[0.06]
                "
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <EventIcon type={event.eventType} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-white/80 truncate">
                                            {event.eventType.replace(/_/g, " ")}
                                        </p>
                                        <p className="font-mono text-xs text-white/30 truncate">
                                            {event.txId.slice(0, 10)}…{event.txId.slice(-6)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right whitespace-nowrap ml-2">
                                    <p className="text-xs text-white/40">
                                        Block #{event.blockHeight}
                                    </p>
                                </div>
                            </motion.a>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </GlassCard>
    );
}

function EventIcon({ type }: { type: string }) {
    const icons: Record<string, string> = {
        smart_contract_log: "📋",
        stx_transfer: "💸",
        fungible_token: "🪙",
        default: "⚡",
    };
    return (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-sm">
            {icons[type] ?? icons.default}
        </span>
    );
}
