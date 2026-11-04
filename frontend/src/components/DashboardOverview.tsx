import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  CheckCircle,
  Zap,
  Layers,
  ArrowRight,
  Flame
} from 'lucide-react';
import { Merchant, RiskTier, Transaction } from '../types';
import { getMerchantImage, SYNTHETIC_RISK_BADGE } from '../merchantVisuals';

interface DashboardOverviewProps {
  merchants: Merchant[];
  transactions: Transaction[];
  onSelectTab: (tab: string) => void;
  onSelectMerchantForAI: (merchantId: string) => void;
  onOpenOverview?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  merchants,
  transactions,
  onSelectTab,
  onSelectMerchantForAI,
  onOpenOverview
}) => {
  const totalVolume = merchants.reduce((sum, m) => sum + m.metrics.totalVolume30d, 0);
  const bettingVolume = merchants
    .filter(m => m.isBettingFront)
    .reduce((sum, m) => sum + m.metrics.totalVolume30d, 0);
  const legitProtectedVolume = totalVolume - bettingVolume;

  const tier3Count = merchants.filter(m => m.currentTier === 'TIER_3_QUARANTINE').length;
  const tier2Count = merchants.filter(m => m.currentTier === 'TIER_2_RESTRICT').length;

  const highRiskTxns = transactions.filter(t => t.riskScore >= 75);

  const rankedMerchants = [...merchants].sort((a, b) => b.driftScore - a.driftScore);
  const topRiskMerchant = rankedMerchants[0];
  const safeMerchants = rankedMerchants.filter(m => m.driftScore < 25);
  const protectedMerchant = (safeMerchants.length ? safeMerchants : rankedMerchants.slice(-1))
    .slice()
    .sort((a, b) => b.metrics.totalVolume30d - a.metrics.totalVolume30d)[0];

  const tierLabel = (tier?: RiskTier) => {
    switch (tier) {
      case 'TIER_3_QUARANTINE':
        return 'TIER 3: QUARANTINE';
      case 'TIER_2_RESTRICT':
        return 'TIER 2: RESTRICTED';
      case 'TIER_1_MONITOR':
        return 'TIER 1: MONITOR';
      default:
        return 'TIER 0: SAFE & ACTIVE';
    }
  };

  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* Editorial Hero Section */}
      <section className="relative pt-6 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center space-x-2">
              <span className="bf-kicker text-neutral-400">[ 01 / LIVE STORE SCANNER ]</span>
              <span className="text-white/20">&bull;</span>
              <span className="text-xs font-mono text-emerald-400">8 CATEGORIES &middot; OSM-SOURCED MERCHANTS</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] font-sans">
              Spotting Betting Fronts Hidden Behind Real Shops.
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-2xl pt-2">
              A smart monitoring tool built for payment gateways. Exposing illegal sports betting disguised as everyday neighborhood shops &mdash; while keeping honest businesses 100% safe from wrongful account freezes. Shop identities come from live OpenStreetMap records across eight merchant categories; every risk score, transaction, and intervention is synthetic demo data.
            </p>
          </div>

          {/* Action Pills */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('stream')}
              className="bf-pill-btn flex items-center space-x-2 text-xs"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Watch Live Payments</span>
            </button>
            <button
              onClick={() => onSelectTab('syndicate')}
              className="bf-pill-btn bf-pill-btn-primary flex items-center space-x-2 text-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>View Betting Network Map</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Baunfire Big Numbers Metric Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bf-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-6">
            <span className="bf-kicker">[ TOTAL MONEY CHECKED ]</span>
            <span className="text-xs font-mono text-neutral-500">30-DAY</span>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
              ₹{(totalVolume / 10000000).toFixed(2)} Cr
            </div>
            <div className="flex items-center space-x-2 mt-2 text-xs font-mono text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{merchants.length} Active Shops Monitored</span>
            </div>
          </div>
        </div>

        <div className="bf-card p-6 rounded-2xl border-rose-500/20 bg-rose-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-6">
            <span className="bf-kicker text-rose-400">[ SUSPICIOUS BETTING MONEY ]</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-rose-300 font-mono">
              ₹{(bettingVolume / 100000).toFixed(1)} L
            </div>
            <div className="flex items-center space-x-2 mt-2 text-xs font-mono text-rose-400">
              <span>{tier3Count + tier2Count} Accounts under review or hold</span>
            </div>
          </div>
        </div>

        <div className="bf-card p-6 rounded-2xl border-emerald-500/20 bg-emerald-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-6">
            <span className="bf-kicker text-emerald-400">[ HONEST SHOPS PROTECTED ]</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-emerald-300 font-mono">
              99.4%
            </div>
            <div className="flex items-center space-x-2 mt-2 text-xs font-mono text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Zero Wrongful Freezes</span>
            </div>
          </div>
        </div>

        <div className="bf-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-6">
            <span className="bf-kicker">[ CHECK SPEED ]</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
              42 ms
            </div>
            <div className="flex items-center space-x-2 mt-2 text-xs font-mono text-neutral-400">
              <span>Automatic real-time check</span>
            </div>
          </div>
        </div>

      </section>

      {/* Featured Visual Case Study Showcase (Baunfire Editorial Cards) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="bf-kicker">[ 02 / OSM SHOP SPOTLIGHT ]</span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Real Shopfronts, Synthetic Risk Storylines
            </h2>
            <p className="text-[11px] font-mono text-neutral-500 mt-1.5 max-w-2xl">
              Business names and addresses are real OpenStreetMap records. Risk tiers, volumes, and transactions are fabricated for this demo.
            </p>
          </div>
          <button
            onClick={() => onSelectTab('merchants')}
            className="text-xs font-mono text-neutral-400 hover:text-white flex items-center space-x-1 transition-all"
          >
            <span>View All Shops</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Highest-risk OSM merchant (synthetic risk profile) */}
          {topRiskMerchant && (
            <div 
              onClick={() => onSelectMerchantForAI(topRiskMerchant.id)}
              className="bf-media-card group cursor-pointer flex flex-col justify-between min-h-[360px]"
            >
              <div className="relative h-48 w-full overflow-hidden">
                <img 
                  src={getMerchantImage(topRiskMerchant)}
                  alt={topRiskMerchant.name}
                  className="w-full h-full object-cover brightness-[0.75] contrast-110 group-hover:brightness-[0.9]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/40 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold backdrop-blur-md">
                    {tierLabel(topRiskMerchant.currentTier)}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="text-xs font-mono font-bold text-rose-400 bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
                    RISK: {topRiskMerchant.driftScore}/100
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                    {topRiskMerchant.name}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    {topRiskMerchant.city}, {topRiskMerchant.state} &bull; {topRiskMerchant.mccDescription} (MCC {topRiskMerchant.mcc})
                  </p>
                  <p className="text-xs text-neutral-300 mt-2.5 line-clamp-2 leading-relaxed">
                    {topRiskMerchant.riskFactors[0] || SYNTHETIC_RISK_BADGE}
                  </p>
                  <p className="text-[10px] font-mono text-neutral-500 mt-2">
                    OSM {topRiskMerchant.osmRef || topRiskMerchant.osmId} &bull; synthetic risk profile
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
                  <span className="text-rose-400">₹{(topRiskMerchant.metrics.totalVolume30d / 100000).toFixed(1)}L / Month</span>
                  <span className="text-neutral-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Inspect with AI <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Highest-volume safe OSM merchant (synthetic risk profile) */}
          {protectedMerchant && (
            <div 
              onClick={() => onSelectMerchantForAI(protectedMerchant.id)}
              className="bf-media-card group cursor-pointer flex flex-col justify-between min-h-[360px]"
            >
              <div className="relative h-48 w-full overflow-hidden">
                <img 
                  src={getMerchantImage(protectedMerchant)}
                  alt={protectedMerchant.name}
                  className="w-full h-full object-cover brightness-[0.75] contrast-110 group-hover:brightness-[0.9]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/40 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold backdrop-blur-md">
                    {tierLabel(protectedMerchant.currentTier)}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
                    RISK: {protectedMerchant.driftScore}/100
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {protectedMerchant.name}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    {protectedMerchant.city}, {protectedMerchant.state} &bull; {protectedMerchant.mccDescription} (MCC {protectedMerchant.mcc})
                  </p>
                  <p className="text-xs text-neutral-300 mt-2.5 line-clamp-2 leading-relaxed">
                    High-volume shop with normal daytime trading and a strong repeat-payer base. Kept fully active as a false-positive safeguard.
                  </p>
                  <p className="text-[10px] font-mono text-neutral-500 mt-2">
                    OSM {protectedMerchant.osmRef || protectedMerchant.osmId} &bull; synthetic risk profile
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400">₹{(protectedMerchant.metrics.totalVolume30d / 100000).toFixed(1)}L / Month</span>
                  <span className="text-neutral-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Inspect with AI <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Cricket Match Betting Window */}
          <div 
            onClick={() => onSelectTab('stream')}
            className="bf-media-card group cursor-pointer flex flex-col justify-between min-h-[360px]"
          >
            <div className="relative h-48 w-full overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80"
                alt="Live Match Floodlights"
                className="w-full h-full object-cover brightness-[0.7] contrast-110 group-hover:brightness-[0.85]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/40 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/40 font-bold backdrop-blur-md flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  SIMULATION SCENARIO
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <span className="text-xs font-mono font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
                  10:30 PM &ndash; 2:00 AM
                </span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  Midnight Match Betting Window
                </h3>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  Death Overs Synchronizer
                </p>
                <p className="text-xs text-neutral-300 mt-2.5 line-clamp-2 leading-relaxed">
                  Real-time scanner detects payments arriving in bursts during cricket death overs and midnight bet settlement cycles.
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400">Live Simulator</span>
                <span className="text-neutral-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Launch Stream <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Active Watchlist */}
      <section>
        
        {/* Live Drift Alerts & Watchlist */}
        <div className="bf-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="bf-kicker">[ SHOPS WATCHLIST ]</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">
                Shops Needing Attention
              </h3>
            </div>
            <button
              onClick={() => onSelectTab('merchants')}
              className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1 transition-all"
            >
              <span>View All Shops</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-neutral-500 font-mono text-[11px] uppercase border-b border-white/[0.08]">
                <tr>
                  <th className="py-2.5 px-3">Shop Name</th>
                  <th className="py-2.5 px-3">Reported &rarr; Actual Sales</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">What Looks Unusual</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rankedMerchants.slice(0, 4).map(m => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-white">{m.name}</div>
                      <div className="text-[10px] font-mono text-neutral-500">
                        {m.city}, {m.state} &bull; MCC {m.mcc}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="text-neutral-400">₹{(m.declaredTurnoverMonthly / 100000).toFixed(1)}L</span>
                      <span className="text-neutral-600 mx-1">&rarr;</span>
                      <span className={m.isBettingFront ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                        ₹{(m.metrics.totalVolume30d / 100000).toFixed(1)}L
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${
                        m.driftScore >= 80 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        m.driftScore >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        m.driftScore >= 25 ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {m.driftScore}/100
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-neutral-300 max-w-[200px] truncate">
                      {m.riskFactors[0] || 'Normal behavior'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => onSelectMerchantForAI(m.id)}
                        className="bf-pill-btn text-[11px] py-1 px-3"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </section>

      {/* Live High-Risk Telemetry Influx */}
      <section className="bf-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            <div>
              <span className="bf-kicker text-rose-400">[ LIVE PAYMENTS ]</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Real-Time Flagged Payments
              </h3>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('stream')}
            className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1 transition-all"
          >
            <span>View All Payments</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {highRiskTxns.slice(0, 3).map(txn => (
            <div key={txn.id} className="p-4 rounded-xl bg-neutral-900/60 border border-rose-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="text-rose-400 font-semibold">{txn.id}</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                    RISK {txn.riskScore}/100
                  </span>
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  ₹{txn.amount.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-neutral-300 font-medium mt-1 truncate">
                  {txn.merchantName}
                </div>
                <div className="text-[11px] text-neutral-500 font-mono mt-1">
                  Payer: {txn.payerId}
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-white/[0.08] flex flex-wrap gap-1">
                {txn.anomalyFlags.slice(0, 2).map((flag, idx) => (
                  <span key={idx} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 font-mono">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
