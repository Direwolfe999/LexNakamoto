import React from "react";
import { Accordion } from "./Accordion";
import { Shield, Clock, Gavel, Bitcoin } from "lucide-react";

export default function HowItWorksPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent mb-6">
                    How LexNakamoto Works
                </h1>
                <p className="text-lg text-gray-400 dark:text-gray-400 max-w-2xl mx-auto">
                    A trustless, milestone-based Escrow protocol leveraging the Stacks SIP-033 integration for secure sBTC settlements.
                </p>
            </div>

            <div className="space-y-6">
                <Accordion title="What is sBTC Escrow?" icon={<Bitcoin className="w-6 h-6 text-orange-500" />}>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        sBTC (Stacks Bitcoin) allows smart contracts on the Stacks blockchain to have read/write access to native Bitcoin. 
                        LexNakamoto operates entirely using sBTC, meaning your funds are 1:1 backed by real Bitcoin while benefiting from the 
                        programmability of smart contracts. When an escrow is created, the funds are securely locked in the 
                        <strong>lex-nakamoto-escrow</strong> protocol until the specified milestone conditions are met.
                    </p>
                </Accordion>

                <Accordion title="How do SIP-033 time-locks work?" icon={<Clock className="w-6 h-6 text-amber-500" />}>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        SIP-033 introduces advanced block-height functionality, which we leverage to create cryptographically secure 
                        time-locks. Every escrow agreement on LexNakamoto defines a specific Stacks block height as its deadline. 
                        <br/><br/>
                        If the milestones are not approved before the blockchain reaches this height, the smart contract automatically 
                        changes the escrow status to <span className="text-red-500 font-semibold">Overdue</span>, enabling dispute resolution mechanisms or immediate refunds 
                        depending on the contractual terms.
                    </p>
                </Accordion>

                <Accordion title="What happens in a dispute?" icon={<Gavel className="w-6 h-6 text-indigo-500" />}>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        In the real world, projects don&apos;t always go to plan. LexNakamoto introduces a decentralized Dispute Resolution 
                        layer. Either the Sponsor (buyer) or the Beneficiary (seller) can flag an escrow as <span className="text-yellow-500 font-semibold">Disputed</span>.
                        <br/><br/>
                        Once disputed, settlement is completely frozen. An administrative oracle (or designated arbiter) must step in 
                        to manually verify the real-world milestone delivery before they utilize the `resolve-dispute` Clarity function 
                        to manually route the funds to the rightful party.
                    </p>
                </Accordion>

                <Accordion title="What is the security guarantee?" icon={<Shield className="w-6 h-6 text-emerald-500" />}>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        LexNakamoto utilizes <strong>Clarity</strong>, a deliberately Turing-incomplete language designed to prevent 
                        re-entrancy attacks and unintended side effects. Every function call strictly validates caller principals against 
                        contract storage schemas before moving any sBTC, guaranteeing mathematical assurance that only authorized parties 
                        have access to funds.
                    </p>
                </Accordion>
            </div>
        </div>
    );
}
