"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-orange-500/30">

            {/* Header */}
            <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                        LexNakamoto
                    </Link>
                    <Link href="/dashboard" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                        Launch dApp →
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-16 pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-6">Privacy Policy</h1>
                    <p className="text-gray-400 text-lg mb-12 border-b border-gray-800 pb-8">
                        Last Updated: March 23, {new Date().getFullYear()}
                    </p>

                    <div className="space-y-12 text-gray-300 leading-relaxed">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
                            <p>
                                This Privacy Policy describes how the LexNakamoto Protocol ("we," "us," or "our") handles data when you interact with our frontend interfaces and smart contracts. Because we operate as a decentralized Web3 protocol utilizing the Stacks network, our approach to data is fundamentally different from traditional Web2 entities.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. Blockchain Public Data</h2>
                            <p className="mb-4">
                                Please be aware that your use of the LexNakamoto smart contracts requires broadcasting transactions to the public Stacks blockchain. As a result, the following information relies on cryptographic proofs and becomes permanently publicly visible:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-300">
                                <li>Your Stacks wallet address (Principal).</li>
                                <li>Transaction amounts, timestamps, and contract interactions.</li>
                                <li>Off-chain data hashes (such as IPFS CIDs attached to invoices).</li>
                            </ul>
                            <p className="mt-4 text-orange-400 text-sm">
                                * We do not control the Stacks blockchain and cannot erase or modify data that has been confirmed in a block.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. Data We Do NOT Collect</h2>
                            <p className="mb-4">As a privacy-preserving non-custodial protocol, we actively avoid collecting unnecessary user data. We do <strong>not</strong> collect:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Personally Identifiable Information (PII) such as your name, email, or physical address.</li>
                                <li>Private keys, seed phrases, or password hashes.</li>
                                <li>Background analytics, cross-site trackers, or advertising telemetry.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. Local Storage and Preferences</h2>
                            <p>
                                Our frontend application may utilize your browser's local storage (e.g., `localStorage` or `sessionStorage`) to save non-sensitive UI preferences (such as dark mode settings or recent connection states). This data never leaves your device and is never transmitted to our servers.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. Contact and Open Source</h2>
                            <p>
                                LexNakamoto is entirely open-source. For technical inquiries, audits, or to inspect the code handling this data, please refer to our official GitHub repository.
                            </p>
                        </section>

                    </div>
                </motion.div>
            </main>

        </div>
    );
}