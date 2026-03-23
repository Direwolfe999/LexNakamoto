// ============================================================================
// ToastNotification — Transaction status feedback
// ============================================================================
// Shows pending / success / failed toasts for blockchain transactions.
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Toast {
    id: string;
    type: "pending" | "success" | "error" | "info";
    title: string;
    message: string;
    txId?: string;
}

// Global toast state (simple approach without external state lib)
let globalSetToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;

export function showToast(toast: Omit<Toast, "id">) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    globalSetToasts?.((prev) => [...prev, { ...toast, id }]);

    // Auto-dismiss success and info after 5s
    if (toast.type === "success" || toast.type === "info") {
        setTimeout(() => {
            globalSetToasts?.((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }

    return id;
}

export function dismissToast(id: string) {
    globalSetToasts?.((prev) => prev.filter((t) => t.id !== id));
}

export function updateToast(id: string, updates: Partial<Toast>) {
    globalSetToasts?.((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
    // Auto-dismiss updated success toasts
    if (updates.type === "success") {
        setTimeout(() => dismissToast(id), 5000);
    }
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        globalSetToasts = setToasts;
        return () => { globalSetToasts = null; };
    }, [setToasts]);

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.95 }}
                        className={`flex w-80 items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-xl ${toastStyles[toast.type]}`}
                    >
                        <span className="mt-0.5 text-lg">{toastIcons[toast.type]}</span>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{toast.title}</p>
                            <p className="mt-0.5 text-xs text-white/60">{toast.message}</p>
                            {toast.txId && (
                                <a
                                    href={`https://explorer.hiro.so/txid/${toast.txId}?chain=testnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-block text-xs text-orange-400 underline underline-offset-2"
                                >
                                    View on Explorer →
                                </a>
                            )}
                        </div>
                        <button
                            onClick={() => dismissToast(toast.id)}
                            className="text-white/30 hover:text-white/60"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        {toast.type === "pending" && (
                            <motion.div
                                className="absolute bottom-0 left-0 h-0.5 bg-orange-500/50"
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 30, ease: "linear" }}
                            />
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

const toastStyles: Record<Toast["type"], string> = {
    pending: "border-orange-500/20 bg-gray-900/95",
    success: "border-emerald-500/20 bg-gray-900/95",
    error: "border-rose-500/20 bg-gray-900/95",
    info: "border-blue-500/20 bg-gray-900/95",
};

const toastIcons: Record<Toast["type"], string> = {
    pending: "⏳",
    success: "✅",
    error: "❌",
    info: "ℹ️",
};
