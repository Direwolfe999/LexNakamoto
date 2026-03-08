// ============================================================================
// Landing Page — LexNakamoto hero
// ============================================================================

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mx-auto max-w-3xl text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-medium text-orange-400"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-400" />
          </span>
          Built for Stacks Nakamoto · Code for STX 2026
        </motion.div>

        <h1 className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-5xl font-extrabold leading-tight text-transparent sm:text-6xl">
          Milestone-Based
          <br />
          <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text">
            sBTC Escrow
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-white/40">
          Lock sBTC in a trustless smart contract. Release funds at 25%, 50%, or
          100% milestones. Dispute resolution with arbiter fallback.
          Bitcoin-level finality.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/dashboard">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                inline-flex items-center gap-2 rounded-xl
                bg-gradient-to-r from-orange-500 to-amber-500
                px-8 py-3.5 text-sm font-semibold text-white
                shadow-lg shadow-orange-500/25
                transition-shadow hover:shadow-orange-500/40
              "
            >
              Launch Dashboard
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </motion.span>
          </Link>
          <a
            href="https://github.com/Direwolfe999/LexNakamoto"
            target="_blank"
            rel="noopener noreferrer"
          >
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                inline-flex items-center gap-2 rounded-xl
                border border-white/[0.1] bg-white/[0.04]
                px-8 py-3.5 text-sm font-medium text-white/60
                backdrop-blur-sm transition-colors hover:bg-white/[0.08]
              "
            >
              View on GitHub
            </motion.span>
          </a>
        </div>
      </motion.div>

      {/* Feature Cards */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3"
      >
        <FeatureCard
          icon="🔒"
          title="Post-Condition Safe"
          description="Every transaction explicitly defines the exact amount of sBTC transferred. No surprises."
        />
        <FeatureCard
          icon="📊"
          title="Milestone Tracking"
          description="Release 25%, 50%, or 100% of locked funds. Delta-based transfers prevent double-spend."
        />
        <FeatureCard
          icon="⚖️"
          title="Dispute Resolution"
          description="Neutral arbiter can split remaining funds between buyer and seller if things go wrong."
        />
      </motion.div>

      {/* Protocol Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mx-auto mt-16 flex items-center gap-12 text-center"
      >
        <StatPill label="Clarity v3" value="Smart Contract" />
        <StatPill label="SIP-010" value="sBTC Token" />
        <StatPill label="20/20" value="Tests Passing" />
      </motion.div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <GlassCard hover className="p-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] text-2xl">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/40">
        {description}
      </p>
    </GlassCard>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-white/30">
        {value}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-white/70">{label}</p>
    </div>
  );
}
