import React, { useState } from 'react';
import { Coins, Croissant, Filter, Flame, RotateCcw, Search, FlaskConical } from 'lucide-react';
import { ScenarioName } from '../api';
import { SimulatedMerchant, Transaction } from '../types';

interface TransactionStreamProps {
  transactions: Transaction[];
  simulatedMerchants: SimulatedMerchant[];
  onSimulate: (scenario: ScenarioName) => void;
  isSimulating: boolean;
}

export const TransactionStream: React.FC<TransactionStreamProps> = ({
  transactions,
  simulatedMerchants,
  onSimulate,
  isSimulating,
}) => {
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'HIGH' | 'SAFE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = transactions.filter(transaction => {
    if (filterRisk === 'HIGH' && transaction.riskScore < 70) return false;
    if (filterRisk === 'SAFE' && transaction.riskScore >= 70) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return [transaction.merchantName, transaction.merchantId, transaction.payerId, transaction.id]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const highRisk = transactions.filter(t => t.riskScore >= 70).length;
  const safe = transactions.length - highRisk;
  const averageRisk = transactions.length
    ? Math.round(transactions.reduce((sum, t) => sum + t.riskScore, 0) / transactions.length)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pt-4 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="bf-kicker text-neutral-400">[ 02 / SIMULATED PAYMENTS ]</span>
              <span className="text-xs font-mono text-rose-300 flex items-center gap-1">
                <FlaskConical className="w-3 h-3" /> SYNTHETIC STREAM
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
              Inject a scenario, watch the SIM feed.
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
              Every payment here belongs to an anonymized <span className="font-mono">SIM-*</span> merchant with a
              fictional name. Scenario buttons call <span className="font-mono">POST /api/simulator/run</span>; real
              OSM ids are rejected by that endpoint with HTTP 409.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onSimulate('IPL_BETTING_BURST')}
              disabled={isSimulating}
              className="bf-pill-btn text-rose-300 border-rose-500/30 text-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              <Flame className="w-3.5 h-3.5" /> Match burst
            </button>
            <button
              onClick={() => onSimulate('FESTIVE_BAKERY_RUSH')}
              disabled={isSimulating}
              className="bf-pill-btn text-emerald-300 border-emerald-500/30 text-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              <Croissant className="w-3.5 h-3.5" /> Honest control
            </button>
            <button
              onClick={() => onSimulate('MULE_RING_SMURF')}
              disabled={isSimulating}
              className="bf-pill-btn text-amber-300 border-amber-500/30 text-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              <Coins className="w-3.5 h-3.5" /> Cross-merchant
            </button>
            <button
              onClick={() => onSimulate('RESET')}
              disabled={isSimulating}
              className="bf-pill-btn text-neutral-400 text-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bf-card p-5 rounded-2xl">
          <span className="bf-kicker">[ SIMULATED PAYMENTS ]</span>
          <div className="text-2xl font-bold font-mono text-white mt-2">{transactions.length}</div>
          <span className="text-[11px] font-mono text-neutral-500">from {simulatedMerchants.length} SIM merchants</span>
        </div>
        <div className="bf-card p-5 rounded-2xl border-rose-500/20 bg-rose-950/10">
          <span className="bf-kicker text-rose-400">[ FLAGGED ]</span>
          <div className="text-2xl font-bold font-mono text-rose-300 mt-2">{highRisk}</div>
          <span className="text-[11px] font-mono text-rose-400">risk score ≥ 70</span>
        </div>
        <div className="bf-card p-5 rounded-2xl border-emerald-500/20 bg-emerald-950/10">
          <span className="bf-kicker text-emerald-400">[ BELOW THRESHOLD ]</span>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-2">{safe}</div>
          <span className="text-[11px] font-mono text-emerald-400">no friction in the simulation</span>
        </div>
        <div className="bf-card p-5 rounded-2xl">
          <span className="bf-kicker">[ MEAN SIM RISK ]</span>
          <div className="text-2xl font-bold font-mono text-white mt-2">{averageRisk}/100</div>
          <span className="text-[11px] font-mono text-neutral-500">computed from the loaded stream</span>
        </div>
      </section>

      <section className="bf-card rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-neutral-500" />
            {[
              { id: 'ALL', label: `All (${transactions.length})` },
              { id: 'HIGH', label: `Flagged (${highRisk})` },
              { id: 'SAFE', label: `Safe (${safe})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterRisk(tab.id as typeof filterRisk)}
                className={`bf-pill-btn text-[11px] ${filterRisk === tab.id ? 'bf-pill-btn-primary' : 'text-neutral-400'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search payment id, SIM merchant, payer..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-neutral-900 border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-500 font-mono text-[10px] uppercase border-b border-white/[0.08]">
              <tr>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3">SIM merchant</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Payer</th>
                <th className="py-2.5 px-3">Risk</th>
                <th className="py-2.5 px-3">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(transaction => (
                <tr key={transaction.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-mono">
                    <span className={transaction.riskScore >= 70 ? 'text-rose-400 font-semibold' : 'text-neutral-400'}>
                      {transaction.id.slice(-14)}
                    </span>
                    <span className="block text-[10px] text-neutral-500">
                      {new Date(transaction.timestamp).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{transaction.merchantName}</div>
                    <div className="text-[10px] font-mono text-neutral-500">{transaction.merchantId}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-white">
                    ₹{transaction.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-neutral-300">
                    <div>{transaction.payerId}</div>
                    <div className="text-[10px] text-neutral-500">
                      {transaction.payerCity}, {transaction.payerState}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded text-[11px] border ${
                      transaction.riskScore >= 80
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : transaction.riskScore >= 50
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {transaction.riskScore}/100
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {transaction.anomalyFlags.length ? (
                        transaction.anomalyFlags.map((flag, index) => (
                          <span key={index} className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-white/5 text-neutral-300 border border-white/10">
                            {flag.replace('SIMULATED_', '')}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] font-mono text-emerald-400">NORMAL_SIMULATED_RETAIL</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-xs font-mono text-neutral-500 py-6">No simulated payments match this filter.</p>
          )}
        </div>
      </section>
    </div>
  );
};
