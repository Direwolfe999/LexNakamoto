"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center text-center px-4">
      {/* Hero Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-400"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
        </span>
        Powered by Nakamoto & sBTC
      </motion.div>

      {/* Main Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-4xl text-5xl font-black tracking-tight text-white sm:text-7xl mb-6"
      >
        Trustless B2B <br />
        <span className="bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
          Bitcoin Escrow
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-2xl text-lg text-gray-400 mb-10 leading-relaxed"
      >
        LexNakamoto provides milestone-based programmable escrows backed by Bitcoin finality. Securely lock funds, resolve disputes with arbiters, and trigger mutual refunds safely.
      </motion.p>

      {/* Call to Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Link
          href="/dashboard"
          className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-900/20 transition-all transform hover:-translate-y-1"
        >
          Launch dApp
        </Link>
        <a
          href="https://github.com/Direwolfe999/LexNakamoto"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-xl font-bold transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
        >
          View Documentation
        </a>
      </motion.div>

      {/* Feature Grid */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full text-left"
      >
        <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center text-2xl mb-4">
            ⛓️
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Bitcoin Finality</h3>
          <p className="text-gray-400 text-sm">Every escrow state change is irreversibly anchored to the Bitcoin L1 through the Stacks network.</p>
        </div>

        <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mb-4">
            ⚖️
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Dispute Resolution</h3>
          <p className="text-gray-400 text-sm">Built-in arbiter functionality allows independent third parties to step in and divide funds fairly.</p>
        </div>

        <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-2xl mb-4">
            💸
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Native sBTC</h3>
          <p className="text-gray-400 text-sm">Transact entirely with natively mapped Bitcoin utilizing the secure sBTC standard directly in contracts.</p>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="mt-20 border-t border-gray-800/60 w-full pt-8 pb-4 text-center mt-auto"
      >
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} LexNakamoto Protocol. All rights reserved.
        </p>
        <div className="flex justify-center gap-4 mt-4 text-gray-400">
          <Link href="/terms" className="hover:text-orange-400 transition-colors text-sm">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-orange-400 transition-colors text-sm">Privacy Policy</Link>
          <a href="https://github.com/Direwolfe999/LexNakamoto" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors text-sm">GitHub</a>
        </div>
      </motion.footer>
    </div>
  );
}
