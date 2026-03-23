// ============================================================================
// ConnectWalletButton — Wallet connection with glassmorphism styling
// ============================================================================

"use client";

import { motion } from "framer-motion";
import { useWallet } from "@/context/WalletContext";

export default function ConnectWalletButton() {
    const { address, isWalletConnected, connectWallet, disconnectWallet } =
        useWallet();

    const truncated = address
        ? `${address.slice(0, 6)}…${address.slice(-4)}`
        : "";

    if (isWalletConnected) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="font-mono text-sm text-white/80">{truncated}</span>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={disconnectWallet}
                    className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
                >
                    Disconnect
                </motion.button>
            </div>
        );
    }

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connectWallet}
            className="
        relative overflow-hidden rounded-xl
        bg-gradient-to-r from-orange-500 to-amber-500
        px-6 py-2.5 text-sm font-semibold text-white
        shadow-lg shadow-orange-500/25
        transition-shadow hover:shadow-orange-500/40
      "
        >
            <span className="relative z-10">Connect Wallet</span>
            <motion.span
                className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400"
                initial={{ x: "-100%" }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
            />
        </motion.button>
    );
}
