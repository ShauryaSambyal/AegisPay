import React, { useState } from 'react';
import { 
  Zap, 
  Flame, 
  Croissant, 
  RotateCcw, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Smartphone,
  Globe,
  Coins,
  Search,
  ArrowUpRight
} from 'lucide-react';
import { Transaction } from '../types';

interface TransactionStreamProps {
  transactions: Transaction[];
  onSimulate: (scenario: 'IPL_BETTING_BURST' | 'FESTIVE_BAKERY_RUSH' | 'MULE_RING_SMURF' | 'RESET') => void;
  isSimulating: boolean;
}

export const TransactionStream: React.FC<TransactionStreamProps> = ({
  transactions,
  onSimulate,
  isSimulating
}) => {
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'HIGH' | 'SAFE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = transactions.filter(t => {
    if (filterRisk === 'HIGH' && t.riskScore < 70) return false;
    if (filterRisk === 'SAFE' && t.riskScore >= 70) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.merchantName.toLowerCase().includes(q) ||
        t.payerId.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const highRiskCount = transactions.filter(t => t.riskScore >= 70).length;
  const safeCount = transactions.length - highRiskCount;

  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* Editorial Header */}
      <section className="relative pt-6 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center space-x-2">
              <span className="bf-kicker text-neutral-400">[ 02 / LIVE PAYMENTS STREAM ]</span>
              <span className="text-white/20">&bull;</span>
              <span className="text-xs font-mono text-emerald-400">INSTANT 42ms SCANNER</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] font-sans">
              Live Payments &amp; Test Scanner.
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-2xl pt-2">
              Every incoming payment is checked in less than a second. 
              Click the test buttons on the right to send test payments (cricket betting spikes or holiday bakery rushes) and see real-time detection in action.
            </p>
          </div>

          {/* Quick Scenario Injectors */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onSimulate('IPL_BETTING_BURST')}
              disabled={isSimulating}
              className="bf-pill-btn text-rose-300 border-rose-500/30 hover:bg-rose-500 hover:text-white flex items-center space-x-1.5 text-xs disabled:opacity-40"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>+ Cricket Bets</span>
            </button>

            <button
              onClick={() => onSimulate('FESTIVE_BAKERY_RUSH')}
              disabled={isSimulating}
              className="bf-pill-btn text-emerald-300 border-emerald-500/30 hover:bg-emerald-500 hover:text-white flex items-center space-x-1.5 text-xs disabled:opacity-40"
            >
              <Croissant className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Cake Rush</span>
            </button>

            <button
              onClick={() => onSimulate('MULE_RING_SMURF')}
              disabled={isSimulating}
              className="bf-pill-btn text-amber-300 border-amber-500/30 hover:bg-amber-500 hover:text-white flex items-center space-x-1.5 text-xs disabled:opacity-40"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Mule Network</span>
            </button>

            <button
              onClick={() => onSimulate('RESET')}
              disabled={isSimulating}
              className="bf-pill-btn text-neutral-400 hover:text-white text-xs disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stream Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bf-card p-5 rounded-2xl">
          <span className="bf-kicker">[ TOTAL CHECKED ]</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-2">
            {transactions.length} Payments
          </div>
          <span className="text-[11px] font-mono text-neutral-500 mt-1 block">Live stream feed</span>
        </div>

        <div className="bf-card p-5 rounded-2xl border-rose-500/20 bg-rose-950/10">
          <span className="bf-kicker text-rose-400">[ FLAGGED SUSPICIOUS ]</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-300 mt-2">
            {highRiskCount} Payments
          </div>
          <span className="text-[11px] font-mono text-rose-400 mt-1 block">Risk score &ge; 70 / 100</span>
        </div>

        <div className="bf-card p-5 rounded-2xl border-emerald-500/20 bg-emerald-950/10">
          <span className="bf-kicker text-emerald-400">[ SAFE &amp; APPROVED ]</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-300 mt-2">
            {safeCount} Payments
          </div>
          <span className="text-[11px] font-mono text-emerald-400 mt-1 block">Instant zero-delay payouts</span>
        </div>

        <div className="bf-card p-5 rounded-2xl">
          <span className="bf-kicker">[ SCAN SPEED ]</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-2">
            42 ms
          </div>
          <span className="text-[11px] font-mono text-neutral-500 mt-1 block">Sub-second risk analysis</span>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="bf-card rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Filter Pills */}
          <div className="flex items-center space-x-2">
            {[
              { id: 'ALL', label: `All Payments (${transactions.length})` },
              { id: 'HIGH', label: `Flagged (${highRiskCount})` },
              { id: 'SAFE', label: `Safe (${safeCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterRisk(tab.id as any)}
                className={`bf-pill-btn text-xs ${
                  filterRisk === tab.id
                    ? 'bf-pill-btn-primary'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search payment ID, shop, payer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-neutral-900 border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
            />
          </div>

        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-500 font-mono text-[11px] uppercase border-b border-white/[0.08]">
              <tr>
                <th className="py-3 px-3">Payment ID</th>
                <th className="py-3 px-3">Shop</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Payer &amp; Location</th>
                <th className="py-3 px-3">Risk Score</th>
                <th className="py-3 px-3">Why Flagged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(txn => {
                const isHigh = txn.riskScore >= 70;
                return (
                  <tr key={txn.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3 font-mono">
                      <span className={isHigh ? 'text-rose-400 font-semibold' : 'text-neutral-400'}>
                        {txn.id}
                      </span>
                      <span className="block text-[10px] text-neutral-500">
                        {new Date(txn.timestamp).toLocaleTimeString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-white">{txn.merchantName}</div>
                      <div className="text-[10px] font-mono text-neutral-500">{txn.merchantId}</div>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-white text-sm">
                      ₹{txn.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-[11px] text-neutral-300">
                      <div>{txn.payerId}</div>
                      <div className="text-[10px] text-neutral-500">{txn.payerCity}, {txn.payerState}</div>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${
                        txn.riskScore >= 80 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        txn.riskScore >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {txn.riskScore}/100
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {txn.anomalyFlags.length > 0 ? (
                          txn.anomalyFlags.map((flag, idx) => (
                            <span 
                              key={idx} 
                              className={`text-[9px] px-2 py-0.5 rounded-full font-mono border ${
                                flag.includes('MATCH') || flag.includes('MULE') 
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                                  : 'bg-white/5 text-neutral-300 border-white/10'
                              }`}
                            >
                              {flag}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] font-mono text-emerald-400">
                            NORMAL_RETAIL
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};
