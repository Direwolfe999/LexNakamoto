"use client";

import { WalletProvider } from "@/context/WalletContext";
import { EscrowProvider } from "@/context/EscrowContext";
import Navbar from "@/components/Navbar";
import ToastContainer from "@/components/ToastNotification";
import type { ReactNode } from "react";

export default function ClientProviders({ children }: { children: ReactNode }) {
    return (
        <WalletProvider>
            <EscrowProvider>
                <Navbar />
                {children}
                <ToastContainer />
            </EscrowProvider>
        </WalletProvider>
    );
}
