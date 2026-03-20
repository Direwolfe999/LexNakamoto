"use client";

import { useState } from "react";
import FinalityTracker from "@/components/FinalityTracker";

export default function EscrowStatusPage() {
    const [txIdInput, setTxIdInput] = useState("");
    const [txId, setTxId] = useState("");

    return (
        <main className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="text-2xl font-bold text-white">Escrow Status</h1>
            <p className="mt-1 text-sm text-white/60">Track fast-path confirmation and Bitcoin anchoring in one view.</p>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setTxId(txIdInput.trim());
                }}
                className="mt-6 flex gap-2"
            >
                <input
                    value={txIdInput}
                    onChange={(e) => setTxIdInput(e.target.value)}
                    placeholder="Paste txid"
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                />
                <button className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white">
                    Track
                </button>
            </form>

            {txId && <div className="mt-6"><FinalityTracker txId={txId} /></div>}
        </main>
    );
}
