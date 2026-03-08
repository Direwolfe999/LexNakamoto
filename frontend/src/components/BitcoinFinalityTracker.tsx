// ============================================================================
// BitcoinFinalityTracker — Nakamoto-era settlement status
// ============================================================================
// Shows the current Stacks block height, Bitcoin burn block height,
// tenure progress, and settlement status so users know when their
// sBTC transaction is 100% settled on Bitcoin.
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import { useEscrow } from "@/context/EscrowContext";
import { getBlockInfo, getTransactionProgress, type BlockInfo, type TxFinalityStage } from "@/lib/stacks-api";
import { BLOCK_TIME_SECONDS } from "@/lib/constants";

export default function BitcoinFinalityTracker() {
    const { latestTxId } = useEscrow();
    const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [stage, setStage] = useState<TxFinalityStage>("mempool-broadcast");

    useEffect(() => {
        let cancelled = false;
        async function fetchInfo() {
            try {
                const info = await getBlockInfo();
                if (!cancelled && info) {
                    setBlockInfo(info);
                    setLastUpdated(new Date());
                }
            } catch {
                // API might be unavailable
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchInfo();
        const interval = setInterval(fetchInfo, 15_000); // 15s refresh
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (!latestTxId) {
            setStage("mempool-broadcast");
            return;
        }

        let cancelled = false;
        async function syncStage() {
            const progress = await getTransactionProgress(latestTxId);
            if (!cancelled) setStage(progress.stage);
        }

        syncStage();
        const id = setInterval(syncStage, 10_000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [latestTxId]);

    // Nakamoto era: blocks within a tenure are fast (~5s), tenure changes
    // happen when a new Bitcoin block is mined (~10min)
    const tenureBlocks = blockInfo
        ? blockInfo.stacksBlockHeight - blockInfo.tenureHeight
        : 0;
    // Settlement progress: after ~6 Bitcoin confirmations (~60min), the
    // Stacks transaction is considered Bitcoin-final
    const estimatedSettlement = Math.min(tenureBlocks, 6);
    const settlementPct = Math.round((estimatedSettlement / 6) * 100);

    const getSettlementStatus = () => {
        if (!blockInfo) return { label: "Loading…", color: "text-white/40" };
        if (settlementPct >= 100)
            return { label: "Bitcoin Final", color: "text-emerald-400" };
        if (settlementPct >= 50)
            return { label: "Settling", color: "text-amber-400" };
        return { label: "Pending", color: "text-orange-400" };
    };

    const status = getSettlementStatus();

    const stageReached = (target: TxFinalityStage) => {
        const order: TxFinalityStage[] = ["mempool-broadcast", "stacks-fast-block", "bitcoin-anchor"];
        return order.indexOf(stage) >= order.indexOf(target);
    };

    return (
        <GlassCard className="p-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">₿</span>
                    <h3 className="text-sm font-semibold text-white">
                        Bitcoin Finality
                    </h3>
                </div>
                <span
                    className={`flex items-center gap-1.5 text-xs font-medium ${status.color}`}
                >
                    <span className="relative flex h-1.5 w-1.5">
                        <span
                            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${status.color.replace("text-", "bg-")}`}
                        />
                        <span
                            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${status.color.replace("text-", "bg-")}`}
                        />
                    </span>
                    {status.label}
                </span>
            </div>

            {loading ? (
                <div className="mt-4 space-y-3">
                    <div className="h-4 animate-pulse rounded bg-white/[0.04]" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.04]" />
                </div>
            ) : blockInfo ? (
                <div className="mt-4 space-y-4">
                    {/* Settlement Progress */}
                    <div>
                        <div className="mb-2 flex justify-between text-xs text-white/40">
                            <span>Settlement Progress</span>
                            <span>{settlementPct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${settlementPct}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <StageRow label="1. Mempool Broadcast" active={stageReached("mempool-broadcast")} />
                        <StageRow label="2. Stacks Fast Block (Internal Finality)" active={stageReached("stacks-fast-block")} />
                        <StageRow label="3. Bitcoin Anchor Block (L1 Settlement)" active={stageReached("bitcoin-anchor")} />
                    </div>

                    {/* Block Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <BlockStat
                            label="Stacks Block"
                            value={`#${blockInfo.stacksBlockHeight.toLocaleString()}`}
                            icon="⚡"
                        />
                        <BlockStat
                            label="Bitcoin Block"
                            value={`#${blockInfo.burnBlockHeight.toLocaleString()}`}
                            icon="₿"
                        />
                        <BlockStat
                            label="Tenure Height"
                            value={`#${blockInfo.tenureHeight.toLocaleString()}`}
                            icon="📦"
                        />
                        <BlockStat
                            label="Tenure Blocks"
                            value={tenureBlocks.toString()}
                            icon="⏱️"
                        />
                    </div>

                    {/* Info */}
                    <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                        <p className="text-xs leading-relaxed text-white/30">
                            <strong className="text-white/50">Nakamoto Era:</strong>{" "}
                            Stacks blocks are fast (~5s) within a tenure. Each new Bitcoin
                            block (~{Math.round(BLOCK_TIME_SECONDS / 60)}min) starts a new
                            tenure. After ~6 Bitcoin confirmations, your sBTC is fully
                            settled on Bitcoin L1.
                        </p>
                    </div>

                    {/* Last updated */}
                    {lastUpdated && (
                        <p className="text-center text-[10px] text-white/20">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            ) : (
                <p className="mt-4 text-sm text-white/30">
                    Unable to fetch block info
                </p>
            )}
        </GlassCard>
    );
}

function StageRow({ label, active }: { label: string; active: boolean }) {
    return (
        <div className="flex items-center justify-between text-xs">
            <span className={active ? "text-white/80" : "text-white/35"}>{label}</span>
            <span className={active ? "text-emerald-400" : "text-white/25"}>{active ? "✓" : "•"}</span>
        </div>
    );
}

function BlockStat({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon: string;
}) {
    return (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5">
                <span className="text-xs">{icon}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                    {label}
                </span>
            </div>
            <p className="mt-1 font-mono text-sm font-semibold text-white">
                {value}
            </p>
        </div>
    );
}
