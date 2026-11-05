import React from 'react';
import { AlertTriangle, ArrowRight, Clock, Database, FlaskConical, Layers, ShieldCheck, Zap } from 'lucide-react';
import { MlModelInfo, RealMerchant, SimulatedMerchant, Transaction } from '../types';
import { getMerchantImage, REAL_OSM_BADGE, tierClasses, tierLabel } from '../merchantVisuals';

interface DashboardOverviewProps {
  realMerchants: RealMerchant[];
  simulatedMerchants: SimulatedMerchant[];
  transactions: Transaction[];
  modelInfo: MlModelInfo | null;
  mlOnline: boolean;
  onSelectTab: (tab: string) => void;
  onSelectMerchantForAI: (merchantId: string) => void;
}

const formatLakhs = (value: number): string => `₹${(value / 100000).toFixed(1)}L`;
const formatPercent = (value: number | null | undefined): string =>
  value === null || value === undefined ? 'n/a' : `${(value * 100).toFixed(1)}%`;

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  realMerchants,
  simulatedMerchants,
  transactions,
  modelInfo,
  mlOnline,
  onSelectTab,
  onSelectMerchantForAI,
}) => {
  const totalVolume = simulatedMerchants.reduce((sum, m) => sum + m.metrics.totalVolume30d, 0);
  const flaggedVolume = simulatedMerchants
    .filter(m => m.riskTier === 'TIER_2_RESTRICT' || m.riskTier === 'TIER_3_QUARANTINE')
    .reduce((sum, m) => sum + m.metrics.totalVolume30d, 0);
  const highRisk = transactions.filter(t => t.riskScore >= 70).length;
  const ranked = [...simulatedMerchants].sort((a, b) => b.riskScore - a.riskScore);
  const timeHoldout = modelInfo?.metrics.splits.time_holdout ?? null;
  const merchantHoldout = modelInfo?.metrics.splits.merchant_holdout ?? null;

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="pt-4 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bf-kicker text-neutral-400">[ 01 / SIMULATED RISK OVERVIEW ]</span>
              <span className="text-white/20">&bull;</span>
              <span className="text-xs font-mono text-rose-300 flex items-center gap-1">
                <FlaskConical className="w-3 h-3" /> SYNTHETIC DATA
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
              Merchant purpose drift on synthetic data.
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed max-w-2xl pt-1">
              Every risk score, transaction and syndicate edge on this dashboard belongs to an anonymized
              <span className="font-mono text-neutral-200"> SIM-* </span>
              merchant. Real OpenStreetMap businesses appear only in the directory, as display-only identities.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button onClick={() => onSelectTab('stream')} className="bf-pill-btn flex items-center gap-2 text-xs">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> Inject a scenario
            </button>
            <button onClick={() => onSelectTab('ml-insights')} className="bf-pill-btn bf-pill-btn-primary flex items-center gap-2 text-xs">
              <Layers className="w-3.5 h-3.5" /> ML Insights <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bf-card p-6 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 mb-5">
            <span className="bf-kicker">[ SIMULATED 30-DAY VOLUME ]</span>
            <Database className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">₹{(totalVolume / 10000000).toFixed(2)} Cr</div>
          <div className="text-xs font-mono text-neutral-400 mt-2">{simulatedMerchants.length} SIM merchants</div>
        </div>

        <div className="bf-card p-6 rounded-2xl border-rose-500/20 bg-rose-950/10">
          <div className="flex items-center justify-between text-neutral-400 mb-5">
            <span className="bf-kicker text-rose-400">[ VOLUME IN RESTRICTED TIERS ]</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-rose-300">{formatLakhs(flaggedVolume)}</div>
          <div className="text-xs font-mono text-rose-400 mt-2">
            {ranked.filter(m => m.riskTier === 'TIER_2_RESTRICT' || m.riskTier === 'TIER_3_QUARANTINE').length} merchants in Tier 2/3
          </div>
        </div>

        <div className="bf-card p-6 rounded-2xl border-emerald-500/20 bg-emerald-950/10">
          <div className="flex items-center justify-between text-neutral-400 mb-5">
            <span className="bf-kicker text-emerald-400">[ REAL OSM DIRECTORY ]</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-300">{realMerchants.length}</div>
          <div className="text-xs font-mono text-emerald-400 mt-2 flex items-center gap-1">
            {REAL_OSM_BADGE} · no risk fields
          </div>
        </div>

        <div className="bf-card p-6 rounded-2xl">
          <div className="flex items-center justify-between text-neutral-400 mb-5">
            <span className="bf-kicker">[ FLAGGED SIM PAYMENTS ]</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {highRisk}/{transactions.length}
          </div>
          <div className="text-xs font-mono text-neutral-400 mt-2">risk score ≥ 70 in the simulated stream</div>
        </div>
      </section>

      <section className="bf-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="bf-kicker">[ MEASURED MODEL METRICS ]</span>
            <h2 className="text-lg font-bold text-white tracking-tight mt-1">Risk model performance</h2>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
            Synthetic evaluation · not real-world accuracy
          </span>
        </div>
        {mlOnline && modelInfo ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            {[
              { label: 'Time holdout F1', value: formatPercent(timeHoldout?.f1) },
              { label: 'Time holdout ROC-AUC', value: timeHoldout?.roc_auc?.toFixed(3) ?? 'not computed' },
              { label: 'Merchant holdout F1', value: formatPercent(merchantHoldout?.f1) },
              { label: 'Positives (time holdout)', value: timeHoldout ? String(timeHoldout.positives) : '0' },
            ].map(cell => (
              <div key={cell.label} className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                <span className="text-neutral-500 block text-[10px] uppercase">{cell.label}</span>
                <span className="text-white text-base font-bold mt-1 block">{cell.value}</span>
              </div>
            ))}
            <p className="col-span-2 lg:col-span-4 text-[11px] text-neutral-400 leading-relaxed">
              These numbers come from <span className="font-mono">/api/ml/model/info</span>. Seed {modelInfo.metrics.seed},
              model v{modelInfo.metrics.modelVersion}. {modelInfo.metrics.caveat}
            </p>
          </div>
        ) : (
          <p className="text-xs text-neutral-400">
            ML service offline. Metrics are not displayed because they must be fetched, never hardcoded.
            Start it with <span className="font-mono text-neutral-200">npm run dev</span>.
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bf-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="bf-kicker">[ SIMULATED WATCHLIST ]</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Highest synthetic risk</h3>
            </div>
            <button onClick={() => onSelectTab('merchants')} className="text-xs font-mono text-neutral-400 hover:text-white">
              Open directory →
            </button>
          </div>
          <div className="space-y-2">
            {ranked.slice(0, 5).map(merchant => (
              <button
                key={merchant.id}
                onClick={() => onSelectMerchantForAI(merchant.id)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900/50 border border-white/[0.06] hover:border-white/20 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{merchant.displayName}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300">
                      SIM
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500">
                    {merchant.id} · {merchant.mccDescription} · {formatLakhs(merchant.metrics.totalVolume30d)}/mo
                  </div>
                </div>
                <span className={`text-[10px] font-mono px-2 py-1 rounded-full border shrink-0 ${tierClasses(merchant.riskTier)}`}>
                  {tierLabel(merchant.riskTier)} · {merchant.riskScore}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bf-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="bf-kicker">[ REAL OSM DIRECTORY ]</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Display-only identities</h3>
            </div>
            <button onClick={() => onSelectTab('merchants')} className="text-xs font-mono text-neutral-400 hover:text-white">
              Browse →
            </button>
          </div>
          <p className="text-[11px] text-neutral-400">
            Real businesses from OpenStreetMap, licensed ODbL-1.0, © OpenStreetMap contributors. They carry no score,
            tier, transaction, drift metric or intervention.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {realMerchants.slice(0, 3).map(merchant => (
              <div key={merchant.id} className="rounded-xl overflow-hidden border border-white/[0.08] bg-neutral-900/50">
                <img src={getMerchantImage(merchant)} alt={merchant.name} className="w-full h-24 object-cover brightness-[0.75]" />
                <div className="p-3">
                  <div className="text-xs font-semibold text-white truncate">{merchant.name}</div>
                  <div className="text-[10px] font-mono text-neutral-500 mt-0.5">{merchant.categoryLabel}</div>
                  <div className="text-[9px] font-mono text-sky-300 mt-1">{REAL_OSM_BADGE}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
