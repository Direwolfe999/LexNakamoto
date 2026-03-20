// ============================================================================
// LexNakamoto — Stacks Wallet Auth Context (v2)
// ============================================================================
// Provides wallet connection state, wallet provider detection (Leather /
// Xverse / OKX), sBTC balance tracking, and session persistence.
// ============================================================================

"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    type ReactNode,
} from "react";
import { connect, disconnect as stacksDisconnect, isConnected, getLocalStorage } from "@stacks/connect";
import { getSbtcBalance } from "@/lib/stacks-api";
import { satsToSbtc, type WalletProviderId } from "@/lib/constants";

// ── Wallet Detection ────────────────────────────────────────────────────────

function detectWalletProvider(): WalletProviderId {
    if (typeof window === "undefined") return "unknown";
    const win = window as unknown as Record<string, unknown>;
    const provider = win.StacksProvider as
        | Record<string, unknown>
        | undefined;
    if (!provider) return "unknown";
    // Leather sets a specific identifier
    if (provider.isLeather || provider.providerName === "Leather") return "leather";
    // Xverse identifies itself
    if (provider.isXverse || provider.providerName === "Xverse") return "xverse";
    // OKX wallet
    if (provider.isOkxWallet || win.okxwallet) return "okx";
    return "unknown";
}

function isWalletInstalled(): boolean {
    if (typeof window === "undefined") return false;
    return !!(window as unknown as Record<string, unknown>).StacksProvider;
}

// ── Context Shape ───────────────────────────────────────────────────────────

interface WalletContextValue {
    address: string | null;
    isWalletConnected: boolean;
    walletProvider: WalletProviderId;
    walletInstalled: boolean;
    sbtcBalance: string;
    sbtcBalanceRaw: bigint;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
    address: null,
    isWalletConnected: false,
    walletProvider: "unknown",
    walletInstalled: false,
    sbtcBalance: "0",
    sbtcBalanceRaw: 0n,
    connectWallet: async () => { },
    disconnectWallet: () => { },
    refreshBalance: async () => { },
});

export const useWallet = () => useContext(WalletContext);

// ── Provider ────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
    const [address, setAddress] = useState<string | null>(null);
    const [walletProvider, setWalletProvider] = useState<WalletProviderId>("unknown");
    const [walletInstalled, setWalletInstalled] = useState(false);
    const [sbtcBalanceRaw, setSbtcBalanceRaw] = useState<bigint>(0n);
    const balanceInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // Detect wallet on mount
    useEffect(() => {
        setWalletInstalled(isWalletInstalled());
        setWalletProvider(detectWalletProvider());
    }, []);

    // Restore session on mount
    useEffect(() => {
        try {
            if (isConnected()) {
                const stored = getLocalStorage();
                const stxAddrs = stored?.addresses?.stx;
                if (stxAddrs && stxAddrs.length > 0) {
                    setAddress(stxAddrs[0].address);
                    setWalletProvider(detectWalletProvider());
                }
            }
        } catch {
            // First visit — no session
        }
    }, []);

    // Fetch sBTC balance
    const refreshBalance = useCallback(async () => {
        if (!address) {
            setSbtcBalanceRaw(0n);
            return;
        }
        try {
            const bal = await getSbtcBalance(address);
            setSbtcBalanceRaw(bal);
        } catch {
            // API may be unavailable
        }
    }, [address]);

    // Refresh balance on address change + polling
    useEffect(() => {
        if (address) {
            refreshBalance();
            balanceInterval.current = setInterval(refreshBalance, 30_000);
        }
        return () => {
            if (balanceInterval.current) clearInterval(balanceInterval.current);
        };
    }, [address, refreshBalance]);

    const connectWallet = useCallback(async () => {
        try {
            const response = await connect();
            const stxAddr = response?.addresses?.find((a) => a.symbol === "STX");
            if (stxAddr) {
                setAddress(stxAddr.address);
                setWalletProvider(detectWalletProvider());
            }
        } catch (err) {
            console.error("Wallet connection failed:", err);
        }
    }, []);

    const disconnectWallet = useCallback(() => {
        stacksDisconnect();
        setAddress(null);
        setSbtcBalanceRaw(0n);
    }, []);

    return (
        <WalletContext.Provider
            value={{
                address,
                isWalletConnected: !!address,
                walletProvider,
                walletInstalled,
                sbtcBalance: satsToSbtc(sbtcBalanceRaw),
                sbtcBalanceRaw,
                connectWallet,
                disconnectWallet,
                refreshBalance,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}
