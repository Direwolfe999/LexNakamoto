"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getTransactionProgress, type TxFinalityStage } from "@/lib/stacks-api";

export interface OptimisticEscrow {
    tempId: string;
    seller: string;
    amountSats: bigint;
    status: "pending-signature" | "submitted" | "confirmed" | "failed";
    txId?: string;
    createdAt: number;
}

interface EscrowContextValue {
    optimisticEscrows: OptimisticEscrow[];
    latestTxId: string | null;
    startOptimisticEscrow: (seller: string, amountSats: bigint) => string;
    markEscrowSubmitted: (tempId: string, txId: string) => void;
    markEscrowFailed: (tempId: string) => void;
    clearOptimisticEscrow: (tempId: string) => void;
    getTxStage: (txId: string) => Promise<TxFinalityStage>;
}

const EscrowContext = createContext<EscrowContextValue | undefined>(undefined);

export function EscrowProvider({ children }: { children: ReactNode }) {
    const [optimisticEscrows, setOptimisticEscrows] = useState<OptimisticEscrow[]>([]);

    const startOptimisticEscrow = useCallback((seller: string, amountSats: bigint) => {
        const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setOptimisticEscrows((prev) => [
            {
                tempId,
                seller,
                amountSats,
                status: "pending-signature",
                createdAt: Date.now(),
            },
            ...prev,
        ]);
        return tempId;
    }, []);

    const markEscrowSubmitted = useCallback((tempId: string, txId: string) => {
        setOptimisticEscrows((prev) =>
            prev.map((e) => (e.tempId === tempId ? { ...e, txId, status: "submitted" } : e)),
        );
    }, []);

    const markEscrowFailed = useCallback((tempId: string) => {
        setOptimisticEscrows((prev) =>
            prev.map((e) => (e.tempId === tempId ? { ...e, status: "failed" } : e)),
        );
    }, []);

    const clearOptimisticEscrow = useCallback((tempId: string) => {
        setOptimisticEscrows((prev) => prev.filter((e) => e.tempId !== tempId));
    }, []);

    const getTxStage = useCallback(async (txId: string): Promise<TxFinalityStage> => {
        const progress = await getTransactionProgress(txId);
        return progress.stage;
    }, []);

    const value = useMemo(
        () => ({
            optimisticEscrows,
            latestTxId: optimisticEscrows.find((e) => !!e.txId)?.txId ?? null,
            startOptimisticEscrow,
            markEscrowSubmitted,
            markEscrowFailed,
            clearOptimisticEscrow,
            getTxStage,
        }),
        [
            optimisticEscrows,
            startOptimisticEscrow,
            markEscrowSubmitted,
            markEscrowFailed,
            clearOptimisticEscrow,
            getTxStage,
        ],
    );

    return <EscrowContext.Provider value={value}>{children}</EscrowContext.Provider>;
}

export function useEscrow() {
    const ctx = useContext(EscrowContext);
    if (!ctx) throw new Error("useEscrow must be used within EscrowProvider");
    return ctx;
}
