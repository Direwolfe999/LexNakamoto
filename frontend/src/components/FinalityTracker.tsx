"use client";

import { useEffect, useMemo, useState } from "react";

type FinalityStatus = "pending" | "fast-path-secure" | "bitcoin-anchored-final" | "failed";

type StatusResponse = {
    txid: string;
    tx_status: string;
    status: FinalityStatus;
    is_unanchored: boolean;
    burn_block_height: number | null;
    canonical: boolean;
};

const LABELS: Record<FinalityStatus, string> = {
    pending: "Pending in mempool",
    "fast-path-secure": "Fast-path secure (Stacks block)",
    "bitcoin-anchored-final": "Bitcoin-anchored final",
    failed: "Failed",
};

export default function FinalityTracker({ txId }: { txId: string }) {
    const [data, setData] = useState<StatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!txId) return;

        let timer: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;

        const tick = async () => {
            try {
                const r = await fetch(`/api/escrow-status/${txId}`);
                const payload = await r.json();
                if (!r.ok) throw new Error(payload?.error ?? "Status lookup failed");
                if (!cancelled) {
                    setData(payload);
                    setError(null);
                }

                if (payload?.status !== "bitcoin-anchored-final" && payload?.status !== "failed") {
                    timer = setTimeout(tick, 10000);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Status lookup failed");
                    timer = setTimeout(tick, 15000);
                }
            }
        };

        void tick();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [txId]);

    const stage = useMemo(() => data?.status ?? "pending", [data?.status]);

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 text-sm font-semibold text-white">Escrow Finality Status</div>
            <div className="text-xs text-white/60 break-all">TX: {txId}</div>

            <div className="mt-4 space-y-2 text-sm">
                <StatusRow active={stage === "pending"} done={stage !== "pending"} label="1. Pending" />
                <StatusRow
                    active={stage === "fast-path-secure"}
                    done={stage === "bitcoin-anchored-final"}
                    label="2. Fast-path secure"
                />
                <StatusRow active={stage === "bitcoin-anchored-final"} done={stage === "bitcoin-anchored-final"} label="3. Bitcoin anchor" />
            </div>

            <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300">
                {LABELS[stage]}
                {data?.burn_block_height ? ` • burn block ${data.burn_block_height}` : ""}
            </div>

            {error && <div className="mt-3 text-xs text-rose-400">{error}</div>}
        </div>
    );
}

function StatusRow({ label, active, done }: { label: string; active: boolean; done: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${done ? "bg-emerald-400" : active ? "bg-cyan-400" : "bg-white/30"
                    }`}
            />
            <span className={done || active ? "text-white" : "text-white/45"}>{label}</span>
        </div>
    );
}
