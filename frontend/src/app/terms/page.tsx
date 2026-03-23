"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TermsOfService() {
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
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-6">Terms of Service</h1>
                    <p className="text-gray-400 text-lg mb-12 border-b border-gray-800 pb-8">
                        Last Updated: March 23, {new Date().getFullYear()}
                    </p>

                    <div className="space-y-12 text-gray-300 leading-relaxed">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using the LexNakamoto Protocol ("Platform," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. The Platform provides smart contract interfaces allowing users to interact with the Stacks blockchain and sBTC protocols.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. Non-Custodial Nature</h2>
                            <p>
                                LexNakamoto is a decentralized, non-custodial protocol. We do not have access to your private keys, seed phrases, or digital assets (including sBTC). You remain solely responsible for the custody of your funds and the management of your Stacks compatible wallet. We cannot reverse, cancel, or refund digital asset transactions once they have been broadcast to the Stacks network.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. Escrow and Dispute Resolution</h2>
                            <ul className="list-disc pl-6 space-y-3 text-gray-300">
                                <li><strong className="text-white">Smart Contracts:</strong> All escrows are governed strictly by the logic of the deployed Clarity smart contracts.</li>
                                <li><strong className="text-white">Arbitration:</strong> The Platform allows for the nomination of third-party Arbiters. We are not responsible for the actions, rulings, or inaction of any Arbiter you choose to nominate.</li>
                                <li><strong className="text-white">Finality:</strong> Dispute resolutions and mutual refunds are final and cryptographically bound to the Bitcoin L1 state.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. Assumption of Risk</h2>
                            <p className="mb-4">
                                You acknowledge that using blockchain technology involves significant risks, including but not limited to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Regulatory and legal uncertainty regarding digital assets.</li>
                                <li>Smart contract vulnerabilities or exploits.</li>
                                <li>Network congestion or fluctuations in transaction fees (gas).</li>
                                <li>De-pegging or failures in underlying bridge protocols (e.g., sBTC minting mechanics).</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. Limitation of Liability</h2>
                            <p>
                                To the maximum extent permitted by law, LexNakamoto and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or digital assets, arising out of your use of or inability to use the protocol.
                            </p>
                        </section>

                    </div>
                </motion.div>
            </main>

        </div>
    );
}