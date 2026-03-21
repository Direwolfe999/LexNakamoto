// ============================================================================
// Navbar — Top navigation with wallet connection
// ============================================================================

"use client";

import { motion } from "framer-motion";
import WalletDiscovery from "./WalletDiscovery";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export default function Navbar() {
    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="
        fixed left-0 right-0 top-0 z-30
        border-b border-gray-200 dark:border-white/[0.06]
        bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl
      "
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-sm font-bold text-white shadow-lg shadow-orange-500/25">
                        LN
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">LexNakamoto</h1>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500 dark:text-white/30">
                            sBTC Escrow Protocol
                        </p>
                    </div>
                </Link>

                {/* Nav Links */}
                <div className="hidden items-center gap-8 md:flex">
                    <NavLink href="/dashboard">Dashboard</NavLink>
                    <NavLink href="/dashboard" label="Escrows">Escrows</NavLink>
                    <NavLink href="/how-it-works">How It Works</NavLink>
                    <NavLink
                        href="https://github.com/Direwolfe999/LexNakamoto"
                        external
                    >
                        GitHub
                    </NavLink>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    {/* Wallet — now using v2 WalletDiscovery */}
                    <WalletDiscovery />
                </div>
            </div>
        </motion.nav>
    );
}

function NavLink({
    href,
    children,
    external,
    label,
}: {
    href: string;
    children: React.ReactNode;
    external?: boolean;
    label?: string;
}) {
    if (external) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-white/40 transition-colors hover:text-white/80"
            >
                {children}
            </a>
        );
    }
    return (
        <Link
            href={href}
            className="text-sm font-medium text-white/40 transition-colors hover:text-white/80"
        >
            {label ?? children}
        </Link>
    );
}
