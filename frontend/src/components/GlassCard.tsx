"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: ReactNode;
    className?: string;
    hover?: boolean;
}

export default function GlassCard({
    children,
    className = "",
    hover = false,
    ...rest
}: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
            className={`
        rounded-2xl border border-white/[0.08]
        bg-white/[0.04] backdrop-blur-xl
        shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        ${className}
      `}
            {...rest}
        >
            {children}
        </motion.div>
    );
}
