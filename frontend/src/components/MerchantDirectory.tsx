import React, { useMemo, useState } from 'react';
import { Search, ShieldCheck, Sliders, Info, MapPin } from 'lucide-react';
import { RealMerchant, RiskTier, SimulatedMerchant } from '../types';
import { getMerchantImage, REAL_OSM_BADGE, SIMULATED_BADGE, tierClasses, tierLabel } from '../merchantVisuals';

interface MerchantDirectoryProps {
  realMerchants: RealMerchant[];
  simulatedMerchants: SimulatedMerchant[];
  onUpdateMerchantTier: (
    merchantId: string,
    updates: Partial<SimulatedMerchant['interventions']> & { tier?: RiskTier }
  ) => void;
  onSelectMerchantForAI: (merchantId: string) => void;
}

type OriginTab = 'real_osm' | 'simulated';

export const MerchantDirectory: React.FC<MerchantDirectoryProps> = ({
  realMerchants,
  simulatedMerchants,
  onUpdateMerchantTier,
  onSelectMerchantForAI,
}) => {
  const [origin, setOrigin] = useState<OriginTab>('real_osm');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const categories = useMemo(
    () => Array.from(new Set(realMerchants.map(m => m.category))).sort(),
    [realMerchants]
  );

  const query = search.trim().toLowerCase();

  const realFiltered = realMerchants.filter(merchant => {
    if (categoryFilter !== 'ALL' && merchant.category !== categoryFilter) return false;
    if (!query) return true;
    return [merchant.name, merchant.address, merchant.categoryLabel, merchant.osmRef]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const simulatedFiltered = simulatedMerchants.filter(merchant => {
    if (tierFilter !== 'ALL' && merchant.riskTier !== tierFilter) return false;
    if (!query) return true;
    return [merchant.displayName, merchant.id, merchant.mccDescription, merchant.category]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pt-4 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <span className="bf-kicker text-neutral-400">[ 04 / DIRECTORY &amp; CONTROLS ]</span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
              Two datasets, never mixed.
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
              Real OpenStreetMap identities are display-only. Simulated <span className="font-mono">SIM-*</span> merchants
              carry the synthetic risk layer and the intervention controls. A risk value never appears on the real tab.
            </p>
          </div>
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search name, category, id..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-neutral-900 border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOrigin('real_osm')}
          className={`bf-pill-btn text-xs ${origin === 'real_osm' ? 'bf-pill-btn-primary' : ''}`}
        >
          Real OSM directory ({realMerchants.length}) · display only
        </button>
        <button
          onClick={() => setOrigin('simulated')}
          className={`bf-pill-btn text-xs ${origin === 'simulated' ? 'bf-pill-btn-primary' : ''}`}
        >
          Simulated risk table ({simulatedMerchants.length}) · SIM-*
        </button>
      </div>

      {origin === 'real_osm' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`bf-pill-btn text-[11px] ${categoryFilter === 'ALL' ? 'bf-pill-btn-primary' : 'text-neutral-400'}`}
            >
              All categories
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`bf-pill-btn text-[11px] ${categoryFilter === category ? 'bf-pill-btn-primary' : 'text-neutral-400'}`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs text-sky-200 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              These are real businesses published on OpenStreetMap (ODbL-1.0, © OpenStreetMap contributors).
              This tab shows identity data only: no risk score, tier, drift metric, transaction, fraud label or
              intervention exists for these records anywhere in the system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {realFiltered.map(merchant => (
              <div key={merchant.id} className="bf-card rounded-2xl overflow-hidden border border-white/[0.08]">
                <div className="relative h-32">
                  <img src={getMerchantImage(merchant)} alt={merchant.name} className="w-full h-full object-cover brightness-[0.7]" />
                  <span className="absolute top-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-200">
                    {REAL_OSM_BADGE}
                  </span>
                  <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-neutral-200">
                    {merchant.osmType}/{merchant.osmId}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="text-sm font-bold text-white truncate">{merchant.name}</h3>
                    <p className="text-[11px] font-mono text-neutral-400">{merchant.categoryLabel}</p>
                  </div>
                  <p className="text-[11px] text-neutral-400 flex items-start gap-1.5">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>
                      {merchant.address}
                      <span className="block text-neutral-500 mt-0.5">
                        {merchant.latitude.toFixed(5)}, {merchant.longitude.toFixed(5)}
                      </span>
                    </span>
                  </p>
                  <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> No risk data attached
                  </div>
                </div>
              </div>
            ))}
          </div>
          {realFiltered.length === 0 && (
            <p className="text-xs text-neutral-500 font-mono">No real OSM shops match this filter.</p>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All SIM merchants' },
              { id: 'TIER_0_SAFE', label: 'Tier 0 · Safe' },
              { id: 'TIER_1_MONITOR', label: 'Tier 1 · Monitor' },
              { id: 'TIER_2_RESTRICT', label: 'Tier 2 · Restrict' },
              { id: 'TIER_3_QUARANTINE', label: 'Tier 3 · Quarantine' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTierFilter(tab.id)}
                className={`bf-pill-btn text-[11px] ${tierFilter === tab.id ? 'bf-pill-btn-primary' : 'text-neutral-400'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {simulatedFiltered.map(merchant => (
              <div key={merchant.id} className="bf-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white">{merchant.displayName}</h3>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
                        {SIMULATED_BADGE}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                        MCC {merchant.mcc}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">{merchant.id}</span>
                    </div>
                    <p className="text-[11px] font-mono text-neutral-400 mt-1">
                      {merchant.mccDescription} · {merchant.city}, {merchant.state} · onboarded {merchant.onboardedAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 block font-mono uppercase">Risk score</span>
                      <span className="text-xl font-bold font-mono text-white">{merchant.riskScore}/100</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${tierClasses(merchant.riskTier)}`}>
                      {tierLabel(merchant.riskTier)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                    <span className="text-neutral-500 block text-[10px]">Simulated volume 30d</span>
                    <span className="text-white font-bold">₹{(merchant.metrics.totalVolume30d / 100000).toFixed(1)}L</span>
                    <span className="text-[10px] text-neutral-500 block">declared ₹{(merchant.declaredTurnoverMonthly / 100000).toFixed(1)}L</span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                    <span className="text-neutral-500 block text-[10px]">Night share vs baseline</span>
                    <span className="text-white font-bold">
                      {(merchant.metrics.nightTimeRatio * 100).toFixed(0)}% / {(merchant.baseline.nightShare * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                    <span className="text-neutral-500 block text-[10px]">Out-of-state payers</span>
                    <span className="text-white font-bold">{(merchant.metrics.outOfStateRatio * 100).toFixed(0)}%</span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                    <span className="text-neutral-500 block text-[10px]">Repeat payers</span>
                    <span className="text-white font-bold">{(merchant.metrics.repeatPayerRatio * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {merchant.riskFactors.slice(0, 3).map((factor, index) => (
                    <span key={index} className="text-[11px] px-3 py-1 rounded-full bg-neutral-900 border border-white/[0.08] text-neutral-300">
                      {factor}
                    </span>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Simulated intervention controls
                    </h4>
                    <button
                      onClick={() => onSelectMerchantForAI(merchant.id)}
                      className="bf-pill-btn text-[11px] py-1 px-3"
                    >
                      Run simulated investigation
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                    <label className="block">
                      <span className="text-neutral-400 font-mono block mb-1">Tier</span>
                      <select
                        value={merchant.riskTier}
                        onChange={event => onUpdateMerchantTier(merchant.id, { tier: event.target.value as RiskTier })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#14141e] border border-[#2e2e42] text-white font-mono focus:border-white focus:outline-none shadow-sm"
                      >
                        <option value="TIER_0_SAFE" className="bg-[#14141e] text-emerald-400">Tier 0 · Safe</option>
                        <option value="TIER_1_MONITOR" className="bg-[#14141e] text-blue-400">Tier 1 · Monitor</option>
                        <option value="TIER_2_RESTRICT" className="bg-[#14141e] text-amber-400">Tier 2 · Restrict</option>
                        <option value="TIER_3_QUARANTINE" className="bg-[#14141e] text-rose-400">Tier 3 · Quarantine</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-neutral-400 font-mono block mb-1">
                        Rolling reserve: {merchant.interventions.rollingReservePercent}%
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        step={5}
                        value={merchant.interventions.rollingReservePercent}
                        onChange={event => onUpdateMerchantTier(merchant.id, { rollingReservePercent: Number(event.target.value) })}
                        className="w-full accent-white mt-2"
                      />
                    </label>
                    <label className="flex items-center gap-2 pt-5 text-neutral-300">
                      <input
                        type="checkbox"
                        checked={merchant.interventions.strFiled}
                        onChange={event => onUpdateMerchantTier(merchant.id, { strFiled: event.target.checked })}
                        className="accent-rose-500 w-3.5 h-3.5"
                      />
                      Simulation flag: review filed
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {simulatedFiltered.length === 0 && (
            <p className="text-xs text-neutral-500 font-mono">No SIM merchants match this filter.</p>
          )}
        </>
      )}
    </div>
  );
};
