"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";

export type SponsorPolicyPayload = {
    summary?: {
        rules?: {
            allowedFunctions?: string[];
            allowedTokenContracts?: string[];
            maxEscrowSats?: string;
            maxPerDay?: number;
            cooldownSeconds?: number;
            minSponsorStx?: string;
            warningSponsorStx?: string;
        };
        sponsor?: {
            address?: string;
            balanceStx?: string;
            lowGasWarning?: boolean;
            canSponsorNow?: boolean;
        };
    };
    decision?: {
        eligible?: boolean;
        reasons?: string[];
    };
};

export default function SponsorPolicyPanel({
    payload,
    loading,
}: {
    payload: SponsorPolicyPayload | null;
    loading: boolean;
}) {
    const [open, setOpen] = useState(false);

    const eligibility = payload?.decision?.eligible ?? false;
    const reasons = payload?.decision?.reasons ?? [];
    const rules = payload?.summary?.rules;
    const sponsor = payload?.summary?.sponsor;

    const badge = useMemo(() => {
        if (loading) return { text: "Checking", style: "bg-white/10 text-white/70 border-white/20" };
        if (eligibility) return { text: "Gasless Eligible", style: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" };
        return { text: "Gasless Restricted", style: "bg-amber-500/15 text-amber-300 border-amber-400/30" };
    }, [eligibility, loading]);

    return (
        <GlassCard className="p-5" hover>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Sponsor Policy Engine</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">Premium Rule Opener</h3>
                    <p className="mt-1 text-xs text-white/50">Who gets free gas is decided by auditable backend rules.</p>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${badge.style}`}>
                        {badge.text}
                    </span>
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                    >
                        {open ? "Hide Rules" : "Open Rules"}
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden"
                    >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Rule label="Allowed methods" value={(rules?.allowedFunctions ?? []).join(", ") || "n/a"} />
                            <Rule label="Allowed tokens" value={(rules?.allowedTokenContracts ?? []).join(", ") || "n/a"} />
                            <Rule label="Max escrow (sats)" value={rules?.maxEscrowSats ?? "n/a"} />
                            <Rule label="24h tx cap" value={String(rules?.maxPerDay ?? "n/a")} />
                            <Rule label="Cooldown (sec)" value={String(rules?.cooldownSeconds ?? "n/a")} />
                            <Rule label="Min sponsor STX" value={rules?.minSponsorStx ?? "n/a"} />
                        </div>

                        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">
                            <p>Sponsor wallet: {sponsor?.address ?? "n/a"}</p>
                            <p>
                                Live balance: {sponsor?.balanceStx ?? "0"} STX
                                {sponsor?.lowGasWarning ? " • Low gas warning" : ""}
                            </p>
                        </div>

                        {!eligibility && reasons.length > 0 && (
                            <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">
                                <p className="mb-1 font-semibold">Why gasless is blocked</p>
                                <ul className="list-disc space-y-1 pl-4">
                                    {reasons.map((reason) => (
                                        <li key={reason}>{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
}

function Rule({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-white/45">{label}</p>
            <p className="mt-1 text-xs text-white/80 break-all">{value}</p>
        </div>
    );
}
