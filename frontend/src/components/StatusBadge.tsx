// ============================================================================
// StatusBadge — Escrow state pill with glassmorphism
// ============================================================================

"use client";

import { motion } from "framer-motion";
import { ESCROW_STATES, STATE_COLORS, STATE_BG_COLORS } from "@/lib/constants";

interface StatusBadgeProps {
    state: number;
    size?: "sm" | "md";
}

export default function StatusBadge({ state, size = "md" }: StatusBadgeProps) {
    const label = ESCROW_STATES[state] ?? "Unknown";
    const textColor = STATE_COLORS[state] ?? "text-gray-400";
    const bgColor = STATE_BG_COLORS[state] ?? "bg-gray-500/20 border-gray-500/30";

    return (
        <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
        inline-flex items-center gap-1.5 rounded-full border
        font-medium backdrop-blur-sm
        ${bgColor} ${textColor}
        ${size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"}
      `}
        >
            <span className="relative flex h-2 w-2">
                {state === 1 && (
                    <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${textColor.replace("text-", "bg-")
                            }`}
                    />
                )}
                <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${textColor.replace("text-", "bg-")
                        }`}
                />
            </span>
            {label}
        </motion.span>
    );
}
