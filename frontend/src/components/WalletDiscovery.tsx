// ============================================================================
// WalletDiscovery — Advanced wallet detection with provider icons
// ============================================================================
// Checks window.StacksProvider to identify Leather / Xverse / OKX.
// Shows a "Wallet Not Found" state with install links.
// ============================================================================

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { WALLET_PROVIDERS } from "@/lib/constants";

export default function WalletDiscovery() {
    const {
        address,
        isWalletConnected,
        walletProvider,
        walletInstalled,
        sbtcBalance,
        connectWallet,
        disconnectWallet,
    } = useWallet();
    const [showDropdown, setShowDropdown] = useState(false);

    const providerInfo = WALLET_PROVIDERS[walletProvider];
    const truncated = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

    // ── Connected State ─────────────────────────────────────────────────
    if (isWalletConnected) {
        return (
            <div className="relative">
                <motion.button
                    onClick={() => setShowDropdown(!showDropdown)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 backdrop-blur-sm transition-colors hover:bg-white/[0.08]"
                >
                    {/* Wallet icon */}
                    <span className="text-lg">{providerInfo.icon}</span>
                    <div className="text-left">
                        <p className="font-mono text-sm text-white/80">{truncated}</p>
                        <p className="text-[10px] text-white/40">
                            {sbtcBalance} sBTC · {providerInfo.name}
                        </p>
                    </div>
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                </motion.button>

                {/* Dropdown */}
                <AnimatePresence>
                    {showDropdown && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/[0.08] bg-gray-900/95 shadow-2xl backdrop-blur-xl"
                        >
                            <div className="border-b border-white/[0.06] p-4">
                                <p className="text-xs font-medium text-white/40">Connected via</p>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-lg">{providerInfo.icon}</span>
                                    <span className="font-medium text-white">{providerInfo.name}</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Address</span>
                                    <span className="font-mono text-white/70">{truncated}</span>
                                </div>
                                <div className="mt-2 flex justify-between text-sm">
                                    <span className="text-white/40">sBTC Balance</span>
                                    <span className="font-mono text-orange-400">{sbtcBalance}</span>
                                </div>
                            </div>
                            <div className="border-t border-white/[0.06] p-3">
                                <button
                                    onClick={() => {
                                        disconnectWallet();
                                        setShowDropdown(false);
                                    }}
                                    className="w-full rounded-lg border border-rose-500/20 bg-rose-500/10 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
                                >
                                    Disconnect
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ── Not Connected State ─────────────────────────────────────────────
    if (!walletInstalled) {
        return <WalletNotFound />;
    }

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connectWallet}
            className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-shadow hover:shadow-orange-500/40"
        >
            <span className="relative z-10 flex items-center gap-2">
                <span>{providerInfo.icon}</span>
                Connect {providerInfo.name}
            </span>
        </motion.button>
    );
}

// ── Wallet Not Found ────────────────────────────────────────────────────────

function WalletNotFound() {
    const [showInstall, setShowInstall] = useState(false);

    const wallets = [
        {
            name: "Leather",
            icon: "🟠",
            url: "https://leather.io",
            desc: "Best for sBTC & Ordinals",
        },
        {
            name: "Xverse",
            icon: "🟣",
            url: "https://xverse.app",
            desc: "Popular mobile + desktop wallet",
        },
        {
            name: "OKX Wallet",
            icon: "⚫",
            url: "https://www.okx.com/web3",
            desc: "Multi-chain with Stacks support",
        },
    ];

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowInstall(!showInstall)}
                className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                No Wallet Found
            </motion.button>

            <AnimatePresence>
                {showInstall && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/[0.08] bg-gray-900/95 p-4 shadow-2xl backdrop-blur-xl"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-white">Install a Stacks Wallet</p>
                            <button onClick={() => window.location.reload()} className="text-xs text-amber-500 hover:text-amber-400">Refresh</button>
                        </div>
                        <div className="space-y-2">
                            {wallets.map((w) => (
                                <a
                                    key={w.name}
                                    href={w.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.06]"
                                >
                                    <span className="text-xl">{w.icon}</span>
                                    <div>
                                        <p className="text-sm font-medium text-white">{w.name}</p>
                                        <p className="text-xs text-white/40">{w.desc}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
