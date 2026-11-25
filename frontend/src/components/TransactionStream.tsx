import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Croissant,
  Filter,
  Flame,
  FlaskConical,
  MapPin,
  Network,
  RotateCcw,
  Search,
  Smartphone,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { ScenarioName } from '../api';
import { SimulatedMerchant, Transaction } from '../types';

interface TransactionStreamProps {
  transactions: Transaction[];
  simulatedMerchants: SimulatedMerchant[];
  onSimulate: (scenario: ScenarioName) => void;
  isSimulating: boolean;
}

interface FlagStyle {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  style: string;
}

const FLAG_MAP: Record<string, FlagStyle> = {
  MATCH_WINDOW_BURST: {
    label: 'Match Window Burst',
    icon: Flame,
    style: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
  },
  MATCH_OVER_BURST: {
    label: 'Over-by-Over Burst',
    icon: Flame,
    style: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
  },
  OUT_OF_STATE_PAYER: {
    label: 'Out-of-State Payer',
    icon: MapPin,
    style: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
  },
  ROUND_STAKE: {
    label: 'Round Stake Tier',
    icon: Coins,
    style: 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.15)]',
  },
  CROSS_MERCHANT_SMURFING: {
    label: 'Mule Ring Smurf',
    icon: Network,
    style: 'bg-red-500/20 text-red-300 border-red-500/35 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
  },
  SHARED_DEVICE: {
    label: 'Shared Device IP',
    icon: Smartphone,
    style: 'bg-orange-500/15 text-orange-300 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.15)]',
  },
  SYNCHRONIZED_DEPOSIT: {
    label: 'Synchronized Deposit',
    icon: Clock,
    style: 'bg-pink-500/15 text-pink-300 border-pink-500/30 shadow-[0_0_8px_rgba(236,72,153,0.15)]',
  },
  HIGH_VELOCITY: {
    label: 'Velocity Spike',
    icon: Zap,
    style: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.15)]',
  },
};

const formatFlag = (rawFlag: string): FlagStyle => {
  const clean = rawFlag.replace(/^SIMULATED_/, '');
  if (FLAG_MAP[clean]) {
    return FLAG_MAP[clean];
  }
  const humanLabel = clean
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return {
    label: humanLabel,
    icon: AlertTriangle,
    style: 'bg-neutral-800/80 text-neutral-300 border-neutral-700',
  };
};

const parsePaymentTimestamp = (isoString: string) => {
  const dateObj = new Date(isoString);
  if (isNaN(dateObj.getTime())) {
    return { dateStr: '—', timeStr: '—', ampm: 'AM', isPM: false };
  }

  const dateStr = dateObj.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const hours24 = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  const isPM = hours24 >= 12;
  const ampm = isPM ? 'PM' : 'AM';
  const hours12 = String(hours24 % 12 || 12).padStart(2, '0');

  return {
    dateStr,
    timeStr: `${hours12}:${minutes}:${seconds}`,
    ampm,
    isPM,
  };
};

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
    return [
      transaction.merchantName,
      transaction.merchantId,
      transaction.payerId,
      transaction.id,
      transaction.osmAddress || '',
      transaction.payerCity || '',
      transaction.payerState || '',
    ]
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="bf-kicker text-neutral-400">[ 02 / PAYMENT STREAM ]</span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" /> OPENSTREETMAP BUSINESS TELEMETRY
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
              Live Payment Stream & Scenario Telemetry
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
              Every payment monitors real businesses catalogued from OpenStreetMap with telemetry simulating behavioral
              drift and anomaly scenarios. Use the scenario triggers to inject real-time match outbursts, festive rushes, or
              cross-merchant mule smurfs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onSimulate('IPL_BETTING_BURST')}
              disabled={isSimulating}
              className="bf-pill-btn text-rose-300 border-rose-500/30 text-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              <Flame className="w-3.5 h-3.5" /> Match outburst
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
          <span className="bf-kicker">[ STREAM VOLUME ]</span>
          <div className="text-2xl font-bold font-mono text-white mt-2">{transactions.length}</div>
          <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            {simulatedMerchants.length} OpenStreetMap businesses
          </span>
        </div>
        <div className="bf-card p-5 rounded-2xl border-rose-500/20 bg-rose-950/10">
          <span className="bf-kicker text-rose-400">[ FLAGGED PAYMENTS ]</span>
          <div className="text-2xl font-bold font-mono text-rose-300 mt-2">{highRisk}</div>
          <span className="text-[11px] font-mono text-rose-400">risk score ≥ 70</span>
        </div>
        <div className="bf-card p-5 rounded-2xl border-emerald-500/20 bg-emerald-950/10">
          <span className="bf-kicker text-emerald-400">[ VERIFIED CLEAN ]</span>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-2">{safe}</div>
          <span className="text-[11px] font-mono text-emerald-400">normal retail behavior</span>
        </div>
        <div className="bf-card p-5 rounded-2xl">
          <span className="bf-kicker">[ MEAN RISK SCORE ]</span>
          <div className="text-2xl font-bold font-mono text-white mt-2">{averageRisk}/100</div>
          <span className="text-[11px] font-mono text-neutral-500">live stream telemetry average</span>
        </div>
      </section>

      <section className="bf-card rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
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
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search business, payment id, payer..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-neutral-900 border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Mobile card layout */}
        <div className="md:hidden space-y-3">
          {filtered.map(transaction => {
            const { dateStr, timeStr, ampm, isPM } = parsePaymentTimestamp(transaction.timestamp);
            return (
              <div key={transaction.id} className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.08] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm truncate">{transaction.merchantName}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-mono text-neutral-500">{transaction.merchantId}</span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded text-[11px] font-mono font-bold border ${
                      transaction.riskScore >= 80
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/35'
                        : transaction.riskScore >= 50
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/35'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
                    }`}
                  >
                    {transaction.riskScore}/100
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                  <div>
                    <div className="font-mono font-bold text-white text-sm">
                      ₹{transaction.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-500 uppercase">{transaction.paymentMethod}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-[11px] text-neutral-200 font-semibold">{timeStr}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                          isPM
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        }`}
                      >
                        {ampm}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{dateStr}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-400">
                  <span className={transaction.riskScore >= 70 ? 'text-rose-400 font-semibold' : 'text-neutral-300'}>
                    {transaction.id.slice(-14)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-neutral-500 shrink-0" />
                    {transaction.payerId} · {transaction.payerCity}, {transaction.payerState}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  {transaction.anomalyFlags.length ? (
                    transaction.anomalyFlags.map((flag, index) => {
                      const { label, icon: FlagIcon, style } = formatFlag(flag);
                      return (
                        <span
                          key={index}
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${style}`}
                        >
                          <FlagIcon className="w-3 h-3 shrink-0" />
                          {label}
                        </span>
                      );
                    })
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      Verified Retail Pattern
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs font-mono text-neutral-500 py-6">No payments match this search or filter.</p>
          )}
        </div>

        {/* Desktop table layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-500 font-mono text-[10px] uppercase border-b border-white/[0.08]">
              <tr>
                <th className="py-2.5 px-3">Payment & Timing</th>
                <th className="py-2.5 px-3">Business (OpenStreetMap)</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Payer Location</th>
                <th className="py-2.5 px-3">Risk</th>
                <th className="py-2.5 px-3">Telemetry Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(transaction => (
                <tr key={transaction.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className={transaction.riskScore >= 70 ? 'text-rose-400 font-semibold' : 'text-neutral-300'}>
                        {transaction.id.slice(-14)}
                      </span>
                    </div>
                    {(() => {
                      const { dateStr, timeStr, ampm, isPM } = parsePaymentTimestamp(transaction.timestamp);
                      return (
                        <div className="mt-1.5 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-neutral-200 font-semibold tracking-tight">
                              {timeStr}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold tracking-wider uppercase border ${
                                isPM
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_6px_rgba(245,158,11,0.15)]'
                                  : 'bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-[0_0_6px_rgba(14,165,233,0.15)]'
                              }`}
                            >
                              {ampm}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                            <Calendar className="w-3 h-3 text-neutral-500 shrink-0" />
                            <span>{dateStr}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white text-[13px]">{transaction.merchantName}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-mono text-neutral-500">{transaction.merchantId}</span>
                    </div>
                    {transaction.osmAddress && (
                      <div className="text-[10px] text-neutral-400 mt-1 truncate max-w-[220px]" title={transaction.osmAddress}>
                        {transaction.osmAddress}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-white text-[13px]">
                    ₹{transaction.amount.toLocaleString('en-IN')}
                    <div className="text-[10px] font-normal text-neutral-500 uppercase">{transaction.paymentMethod}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-neutral-300">
                    <div className="font-medium text-white">{transaction.payerId}</div>
                    <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-neutral-500 shrink-0" />
                      {transaction.payerCity}, {transaction.payerState}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-[11px] border ${
                        transaction.riskScore >= 80
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/35 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                          : transaction.riskScore >= 50
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/35 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                      }`}
                    >
                      {transaction.riskScore}/100
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {transaction.anomalyFlags.length ? (
                        transaction.anomalyFlags.map((flag, index) => {
                          const { label, icon: FlagIcon, style } = formatFlag(flag);
                          return (
                            <span
                              key={index}
                              className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-medium border transition-all ${style}`}
                            >
                              <FlagIcon className="w-3 h-3 shrink-0" />
                              {label}
                            </span>
                          );
                        })
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          Verified Retail Pattern
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-xs font-mono text-neutral-500 py-6">No payments match this search or filter.</p>
          )}
        </div>
      </section>
    </div>
  );
};
