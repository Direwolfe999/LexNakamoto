"use client";

import FinalityTracker from "@/components/FinalityTracker";

export default function EscrowTxStatusPage({ params }: { params: { txid: string } }) {
    const txId = decodeURIComponent(params.txid ?? "");

    return (
        <main className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="text-2xl font-bold text-white">Escrow Status</h1>
            <p className="mt-1 text-sm text-white/60">Track fast-path confirmation and Bitcoin anchoring in one view.</p>

            {!txId ? (
                <p className="mt-6 text-sm text-rose-400">Missing transaction ID.</p>
            ) : (
                <div className="mt-6">
                    <FinalityTracker txId={txId} />
                </div>
            )}
        </main>
    );
}
