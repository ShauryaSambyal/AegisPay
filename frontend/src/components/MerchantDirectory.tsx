import React, { useState } from 'react';
import { 
  Layers, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Sliders, 
  Bot, 
  Check, 
  FileText, 
  MapPin, 
  Video, 
  Lock,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { Merchant, RiskTier } from '../types';
import { getMerchantImage, SYNTHETIC_RISK_BADGE } from '../merchantVisuals';

interface MerchantDirectoryProps {
  merchants: Merchant[];
  onUpdateMerchantTier: (merchantId: string, updates: Partial<Merchant['interventions']> & { tier?: RiskTier }) => void;
  onSelectMerchantForAI: (merchantId: string) => void;
}

export const MerchantDirectory: React.FC<MerchantDirectoryProps> = ({
  merchants,
  onUpdateMerchantTier,
  onSelectMerchantForAI
}) => {
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = merchants.filter(m => {
    if (filterTier !== 'ALL' && m.currentTier !== filterTier) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.legalEntity.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        (m.address ?? '').toLowerCase().includes(q) ||
        m.mcc.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* Editorial Header */}
      <section className="relative pt-6 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center space-x-2">
              <span className="bf-kicker text-neutral-400">[ 04 / SHOPS &amp; PROTECTION CONTROLS ]</span>
              <span className="text-white/20">&bull;</span>
              <span className="text-xs font-mono text-emerald-400">FAIR SAFETY CONTROLS</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] font-sans">
              Shops Directory &amp; Protection Controls.
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-2xl pt-2">
              Review shop registration details and customize safety settings. 
              Adjust hold reserve percentages, enforce local distance fences, or run an AI deep check with a single click.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300">
                {SYNTHETIC_RISK_BADGE}
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search shop, PAN, category, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-neutral-900 border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'ALL', label: 'All Shops' },
          { id: 'TIER_0_SAFE', label: 'Tier 0: Safe (Instant Payouts)' },
          { id: 'TIER_1_MONITOR', label: 'Tier 1: Watch (Gentle Review)' },
          { id: 'TIER_2_RESTRICT', label: 'Tier 2: Partial Hold' },
          { id: 'TIER_3_QUARANTINE', label: 'Tier 3: Blocked' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTier(tab.id)}
            className={`bf-pill-btn text-xs ${
              filterTier === tab.id
                ? 'bf-pill-btn-primary'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Merchant Cards List */}
      <div className="space-y-4">
        {filtered.map(merchant => {
          const isExpanded = expandedId === merchant.id;
          const isQuarantine = merchant.currentTier === 'TIER_3_QUARANTINE';
          const isRestrict = merchant.currentTier === 'TIER_2_RESTRICT';
          const isSafe = merchant.currentTier === 'TIER_0_SAFE';
          const merchantImg = getMerchantImage(merchant);

          return (
            <div
              key={merchant.id}
              className={`bf-card rounded-2xl overflow-hidden transition-all duration-300 border ${
                isQuarantine
                  ? 'border-rose-500/30'
                  : isRestrict
                  ? 'border-amber-500/30'
                  : isSafe
                  ? 'border-emerald-500/20'
                  : 'border-white/[0.08]'
              }`}
            >
              {/* Summary Bar */}
              <div 
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                onClick={() => setExpandedId(isExpanded ? null : merchant.id)}
              >
                <div className="flex items-center space-x-4">
                  {/* Merchant Thumbnail */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 relative">
                    <img 
                      src={merchantImg} 
                      alt={merchant.name} 
                      className="w-full h-full object-cover brightness-[0.8]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-base text-white tracking-tight">{merchant.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                        MCC {merchant.mcc}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300">
                        OSM
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      {merchant.legalEntity} &bull; {merchant.city}, {merchant.state} &bull; PAN: {merchant.panNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 block font-mono uppercase">Risk Score</span>
                    <span className={`text-xl font-bold font-mono ${
                      merchant.driftScore >= 75 ? 'text-rose-400' :
                      merchant.driftScore >= 45 ? 'text-amber-400' :
                      'text-emerald-400'
                    }`}>
                      {merchant.driftScore}/100
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`text-[10px] uppercase font-bold font-mono px-3 py-1 rounded-full border block ${
                      isQuarantine ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      isRestrict ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      isSafe ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    }`}>
                      {merchant.currentTier.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-neutral-500">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details & Controls */}
              {isExpanded && (
                <div className="p-6 pt-0 border-t border-white/[0.08] space-y-6">
                  
                  {/* Real-world identity provenance */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 text-xs">
                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.06] sm:col-span-2">
                      <span className="text-neutral-500 block text-[10px] font-mono uppercase">OpenStreetMap Record</span>
                      <span className="font-bold text-white mt-0.5 block">
                        {merchant.osmType ?? 'osm'}/{merchant.osmRef ?? merchant.osmId ?? 'unknown'}
                      </span>
                      <span className="text-[11px] text-neutral-400 block mt-1">
                        {merchant.address ?? `${merchant.city}, ${merchant.state}`}
                        {typeof merchant.latitude === 'number' && typeof merchant.longitude === 'number'
                          ? ` · ${merchant.latitude.toFixed(4)}, ${merchant.longitude.toFixed(4)}`
                          : ''}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                      <span className="text-neutral-500 block text-[10px] font-mono uppercase">Data Source</span>
                      <span className="font-bold text-sky-300 mt-0.5 block">
                        {merchant.dataSource ?? 'OpenStreetMap / Overpass API'}
                      </span>
                      <span className="text-[11px] text-neutral-400 block mt-1">
                        Shop identity is real. Risk metrics and transactions are synthetic demo data.
                      </span>
                    </div>
                  </div>

                  {/* Metric Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 text-xs font-mono">
                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                      <span className="text-neutral-500 block text-[10px]">30-Day Sales / Declared</span>
                      <span className="font-bold text-white text-base mt-0.5 block">
                        ₹{(merchant.metrics.totalVolume30d / 100000).toFixed(1)}L
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        Reported: ₹{(merchant.declaredTurnoverMonthly / 100000).toFixed(1)}L
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                      <span className="text-neutral-500 block text-[10px]">Out-of-State Buyers</span>
                      <span className={`font-bold text-base mt-0.5 block ${merchant.metrics.outOfStateRatio > 0.4 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {(merchant.metrics.outOfStateRatio * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {merchant.metrics.outOfStateRatio > 0.4 ? 'Nationwide buyers' : 'Local neighborhood'}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                      <span className="text-neutral-500 block text-[10px]">Late-Night Payments</span>
                      <span className={`font-bold text-base mt-0.5 block ${merchant.metrics.nightTimeRatio > 0.3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {(merchant.metrics.nightTimeRatio * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        10:00 PM &ndash; 4:00 AM
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                      <span className="text-neutral-500 block text-[10px]">Repeat Local Customers</span>
                      <span className={`font-bold text-base mt-0.5 block ${merchant.metrics.repeatPayerRatio < 0.1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {(merchant.metrics.repeatPayerRatio * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {merchant.metrics.repeatPayerRatio > 0.3 ? 'Regular community' : 'Mostly strangers'}
                      </span>
                    </div>
                  </div>

                  {/* Anomaly Factors */}
                  <div>
                    <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider block mb-2 font-semibold">
                      What Looks Unusual:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {merchant.riskFactors.map((factor, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-3 py-1 rounded-full bg-neutral-900 border border-white/[0.08] text-neutral-300 font-sans"
                        >
                          &bull; {factor}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Proportionate Tier Adjustment Controls */}
                  <div className="p-5 rounded-xl bg-neutral-950 border border-white/[0.08] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">
                          <Sliders className="w-4 h-4 text-emerald-400" />
                          Safety Controls &amp; Limits
                        </h4>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Change safety actions. Adjustments take effect immediately on payment rails.
                        </p>
                      </div>

                      <button
                        onClick={() => onSelectMerchantForAI(merchant.id)}
                        className="bf-pill-btn bf-pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>Run Gemini AI Investigation</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 text-xs">
                      {/* Set Tier */}
                      <div>
                        <label className="text-neutral-400 block mb-1 font-mono text-[11px]">Safety Level:</label>
                        <select
                          value={merchant.currentTier}
                          onChange={(e) => onUpdateMerchantTier(merchant.id, { tier: e.target.value as RiskTier })}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/[0.1] text-white font-mono text-xs focus:outline-none"
                        >
                          <option value="TIER_0_SAFE">Tier 0: Safe (Instant Payouts)</option>
                          <option value="TIER_1_MONITOR">Tier 1: Watch (Gentle Review)</option>
                          <option value="TIER_2_RESTRICT">Tier 2: Partial Hold (Reserve)</option>
                          <option value="TIER_3_QUARANTINE">Tier 3: Block &amp; File Report</option>
                        </select>
                      </div>

                      {/* Rolling Reserve */}
                      <div>
                        <label className="text-neutral-400 block mb-1 font-mono text-[11px]">
                          Reserve Hold: <span className="text-white font-bold">{merchant.interventions.rollingReservePercent}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          step="5"
                          value={merchant.interventions.rollingReservePercent}
                          onChange={(e) => onUpdateMerchantTier(merchant.id, { rollingReservePercent: Number(e.target.value) })}
                          className="w-full accent-white mt-1"
                        />
                      </div>

                      {/* Smart Geofence */}
                      <div className="flex items-center space-x-2 pt-4">
                        <input
                          type="checkbox"
                          id={`geo-${merchant.id}`}
                          checked={merchant.interventions.smartGeoFenceActive}
                          onChange={(e) => onUpdateMerchantTier(merchant.id, { smartGeoFenceActive: e.target.checked })}
                          className="rounded bg-neutral-900 border-white/20 accent-emerald-500 w-4 h-4"
                        />
                        <label htmlFor={`geo-${merchant.id}`} className="text-neutral-300 font-medium cursor-pointer">
                          Enforce 15km Distance Fence
                        </label>
                      </div>

                      {/* STR Report Checkbox */}
                      <div className="flex items-center space-x-2 pt-4">
                        <input
                          type="checkbox"
                          id={`str-${merchant.id}`}
                          checked={merchant.interventions.strFiled}
                          onChange={(e) => onUpdateMerchantTier(merchant.id, { strFiled: e.target.checked })}
                          className="rounded bg-neutral-900 border-white/20 accent-rose-500 w-4 h-4"
                        />
                        <label htmlFor={`str-${merchant.id}`} className="text-neutral-300 font-medium cursor-pointer">
                          File Official Bank Report
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
