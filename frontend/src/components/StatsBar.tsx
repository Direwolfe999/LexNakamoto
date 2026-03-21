// ============================================================================
// StatsBar — Key metrics overview
// ============================================================================

"use client";

import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import { satsToSbtc } from "@/lib/constants";
import type { EscrowData } from "@/lib/stacks-api";
import { getContractSbtcBalance } from "@/lib/stacks-api";
import { useEffect, useState } from "react";

interface StatsBarProps {
    escrows: EscrowData[];
}

export default function StatsBar({ escrows }: StatsBarProps) {
    const [contractBalance, setContractBalance] = useState<bigint>(0n);

    useEffect(() => {
        getContractSbtcBalance().then(setContractBalance).catch(() => { });
    }, [escrows]);

    const totalLocked = contractBalance > 0n
        ? contractBalance
        : escrows.reduce((sum, e) => sum + (e.totalAmount - e.releasedAmount), 0n);
    const totalReleased = escrows.reduce(
        (sum, e) => sum + e.releasedAmount,
        0n,
    );
    const activeCount = escrows.filter((e) => e.state === 1).length;
    const disputedCount = escrows.filter((e) => e.state === 2).length;

    const stats = [
        {
            label: "Contract Locked",
            value: `${satsToSbtc(totalLocked)} sBTC`,
            icon: "🔒",
            color: "from-orange-500/20 to-amber-500/20",
        },
        {
            label: "Total Released",
            value: `${satsToSbtc(totalReleased)} sBTC`,
            icon: "💸",
            color: "from-emerald-500/20 to-teal-500/20",
        },
        {
            label: "Active Escrows",
            value: activeCount.toString(),
            icon: "⚡",
            color: "from-blue-500/20 to-indigo-500/20",
        },
        {
            label: "In Dispute",
            value: disputedCount.toString(),
            icon: "⚠️",
            color: "from-amber-500/20 to-yellow-500/20",
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                    <GlassCard className="p-5">
                        <div className="flex items-center gap-4">
                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-lg`}
                            >
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                                    {stat.label}
                                </p>
                                <p className="mt-0.5 text-xl font-bold text-white">
                                    {stat.value}
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            ))}
        </div>
    );
}
