
import React, { useState, useEffect } from 'react';

export default function LexNakamotoDashboard() {
  const [sbtcPrice, setSbtcPrice] = useState<number | null>(65420.50); // Mock Redstone/Stacks API
  const [escrowAmt, setEscrowAmt] = useState<number>(2.5);
  const [finalityState, setFinalityState] = useState<'pending' | 'fast-path-secure' | 'bitcoin-anchored-final'>('pending');

  // Feature 6: WebSocket Sync Simulator
  useEffect(() => {
    const timer1 = setTimeout(() => setFinalityState('fast-path-secure'), 5000); // 5s Nakamoto Fast-Path
    const timer2 = setTimeout(() => setFinalityState('bitcoin-anchored-final'), 15000); // Simulated L1
    return () => { clearTimeout(timer1); clearTimeout(timer2) };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-10 font-sans">
      <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-600 mb-2">LexNakamoto B2B Escrow</h1>
      <p className="text-gray-400 mb-10 text-sm">Powered by Nakamoto & sBTC</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Feature 4: Live Mempool Fast-Path UI */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Transaction Finality (Nakamoto)</h2>
          
          <div className="space-y-4">
            <div className={`p-4 rounded-lg flex items-center transition-all duration-500 ${finalityState === 'pending' ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
               <span className="text-2xl mr-4">{finalityState === 'pending' ? '⏳' : '⚡'}</span>
               <div>
                 <p className="font-bold">{finalityState === 'pending' ? 'Mempool Pending...' : 'Fast-Path Secured (~5s)'}</p>
                 <p className="text-xs text-gray-400">Nakamoto block confirmation via Stacks API</p>
               </div>
            </div>

            <div className={`p-4 rounded-lg flex items-center transition-all duration-500 ${finalityState === 'bitcoin-anchored-final' ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-gray-800 border border-gray-700 opacity-50'}`}>
               <span className="text-2xl mr-4">{finalityState === 'bitcoin-anchored-final' ? '🔒' : '⛓️'}</span>
               <div>
                 <p className="font-bold">{finalityState === 'bitcoin-anchored-final' ? 'Bitcoin L1 Anchored' : 'Awaiting Bitcoin L1...'}</p>
                 <p className="text-xs text-gray-400">100% Finality Reached</p>
               </div>
            </div>
          </div>
        </div>

        {/* Feature 5: Fiat-to-sBTC Volatility Display */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Active Escrow Valuation</h2>
          
          <div className="bg-black/50 p-6 rounded-lg text-center">
            <div className="text-5xl font-mono font-bold text-orange-500 mb-2">
              {escrowAmt} <span className="text-2xl text-orange-700">sBTC</span>
            </div>
            
            {/* Real-time USD mapping */}
            <div className="text-2xl text-green-400 font-semibold mb-1">
              ≈ ${(escrowAmt * (sbtcPrice || 0)).toLocaleString()} USD
            </div>
            <p className="text-xs text-gray-500">Live API Oracle Price: $ {(sbtcPrice || 0).toLocaleString()} / BTC</p>
          </div>
          
          <div className="mt-6 flex gap-4">
             <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors">Sign Mutual Refund</button>
             <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors">View Invoice Hash (IPFS)</button>
          </div>
        </div>
        
      </div>
    </main>
  );
}
