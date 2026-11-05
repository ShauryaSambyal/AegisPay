import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  Flame,
  HelpCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  WifiOff,
  Zap,
} from 'lucide-react';
import { fetchMlDatasets, predictBusinessOutcome } from '../api';
import {
  MerchantScoreResponse,
  MlDatasets,
  MlModelInfo,
  RealMerchant,
  SimulatedMerchant,
  SplitMetrics,
} from '../types';
import { tierClasses, tierLabel } from '../merchantVisuals';

interface MLInsightsProps {
  simulatedMerchants: SimulatedMerchant[];
  realMerchants?: RealMerchant[];
  modelInfo: MlModelInfo | null;
  mlOnline: boolean;
  onRefresh: () => void;
}

const pct = (value: number | null | undefined): string =>
  value === null || value === undefined ? 'not computed' : `${(value * 100).toFixed(1)}%`;

const metricRows: { key: 'precision' | 'recall' | 'f1' | 'roc_auc' | 'pr_auc'; label: string }[] = [
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1', label: 'F1' },
  { key: 'roc_auc', label: 'ROC-AUC' },
  { key: 'pr_auc', label: 'PR-AUC' },
];

const PRESETS = [
  {
    id: 'betting_front',
    label: 'Betting Platform Front',
    badge: 'HIGH RISK',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    icon: Flame,
    desc: 'Heavy late-night inflow, round betting stakes, disposable single-use wallets',
    values: {
      nightShare: 0.62,
      roundAmountRatio: 0.68,
      outOfStateShare: 0.75,
      repeatPayerRatio: 0.03,
      burstSyncRatio: 0.45,
      volumeMultiplier: 4.2,
      suspectedBettingActivity: true,
    },
  },
  {
    id: 'match_spike',
    label: 'IPL / Match Infiltration',
    badge: 'SURGE RISK',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: Zap,
    desc: 'Intense clustering during match hours, multi-state payer influx',
    values: {
      nightShare: 0.48,
      roundAmountRatio: 0.55,
      outOfStateShare: 0.62,
      repeatPayerRatio: 0.08,
      burstSyncRatio: 0.52,
      volumeMultiplier: 3.1,
      suspectedBettingActivity: true,
    },
  },
  {
    id: 'legitimate',
    label: 'Legitimate Retail Business',
    badge: 'CLEAN',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: CheckCircle2,
    desc: 'Regular daytime retail, natural customer retention, clean ticket distribution',
    values: {
      nightShare: 0.04,
      roundAmountRatio: 0.06,
      outOfStateShare: 0.05,
      repeatPayerRatio: 0.48,
      burstSyncRatio: 0.02,
      volumeMultiplier: 1.0,
      suspectedBettingActivity: false,
    },
  },
];

export const DECLARED_CATEGORIES = [
  { value: 'bakery', label: 'Bakery', mcc: 'MCC 5462 · Retail Bakeries & Pastry Shops' },
  { value: 'cafe', label: 'Café', mcc: 'MCC 5814 · Cafés, Coffee Shops & Fast Food' },
  { value: 'clothing', label: 'Clothing', mcc: 'MCC 5651 · Family Clothing Stores' },
  { value: 'convenience', label: 'Convenience Store', mcc: 'MCC 5499 · Miscellaneous Food Stores' },
  { value: 'electronics', label: 'Electronics', mcc: 'MCC 5732 · Electronics Stores' },
  { value: 'grocery', label: 'Grocery Store', mcc: 'MCC 5411 · Supermarkets & Groceries' },
  { value: 'hotel', label: 'Hotel', mcc: 'MCC 7011 · Hotels & Lodging' },
  { value: 'pharmacy', label: 'Pharmacy', mcc: 'MCC 5912 · Drug Stores & Pharmacies' },
  { value: 'restaurant', label: 'Restaurant', mcc: 'MCC 5812 · Eating Places & Restaurants' },
];

export const MLInsights: React.FC<MLInsightsProps> = ({
  simulatedMerchants,
  realMerchants = [],
  modelInfo,
  mlOnline,
  onRefresh,
}) => {
  const [datasets, setDatasets] = useState<MlDatasets | null>(null);

  // Business predictor state
  const [inputMode, setInputMode] = useState<'catalog' | 'custom'>('custom');
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(simulatedMerchants[0]?.id ?? '');
  const [customBusinessName, setCustomBusinessName] = useState<string>('Apex Sports & Bet Lounge');
  const [customCategory, setCustomCategory] = useState<string>('restaurant');
  const [activePreset, setActivePreset] = useState<string>('betting_front');

  // Fine-tuning parameters
  const [nightShare, setNightShare] = useState<number>(0.62);
  const [roundRatio, setRoundRatio] = useState<number>(0.68);
  const [outOfStateShare, setOutOfStateShare] = useState<number>(0.75);
  const [repeatRatio, setRepeatRatio] = useState<number>(0.03);
  const [burstRatio, setBurstRatio] = useState<number>(0.45);
  const [volumeMult, setVolumeMult] = useState<number>(4.2);
  const [suspectedFlag, setSuspectedFlag] = useState<boolean>(true);

  // Prediction output
  const [score, setScore] = useState<MerchantScoreResponse | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!mlOnline) {
      setDatasets(null);
      return;
    }
    fetchMlDatasets()
      .then(setDatasets)
      .catch(() => setDatasets(null));
  }, [mlOnline]);

  const applyPreset = (presetId: string) => {
    const p = PRESETS.find(item => item.id === presetId);
    if (!p) return;
    setActivePreset(presetId);
    setNightShare(p.values.nightShare);
    setRoundRatio(p.values.roundAmountRatio);
    setOutOfStateShare(p.values.outOfStateShare);
    setRepeatRatio(p.values.repeatPayerRatio);
    setBurstRatio(p.values.burstSyncRatio);
    setVolumeMult(p.values.volumeMultiplier);
    setSuspectedFlag(p.values.suspectedBettingActivity);
  };

  const handlePredict = async () => {
    setIsScoring(true);
    setScoreError(null);
    try {
      if (inputMode === 'catalog') {
        const result = await predictBusinessOutcome({
          merchantId: selectedMerchantId,
          suspectedBettingActivity: suspectedFlag,
          nightShare,
          roundAmountRatio: roundRatio,
          outOfStateShare,
          repeatPayerRatio: repeatRatio,
          burstSyncRatio: burstRatio,
          volumeMultiplier: volumeMult,
        });
        setScore(result);
      } else {
        const result = await predictBusinessOutcome({
          businessName: customBusinessName.trim() || 'Custom Business',
          category: customCategory,
          suspectedBettingActivity: suspectedFlag,
          nightShare,
          roundAmountRatio: roundRatio,
          outOfStateShare,
          repeatPayerRatio: repeatRatio,
          burstSyncRatio: burstRatio,
          volumeMultiplier: volumeMult,
        });
        setScore(result);
      }
    } catch (error) {
      setScore(null);
      setScoreError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsScoring(false);
    }
  };

  // Run initial prediction on mount if empty
  useEffect(() => {
    if (mlOnline && !score) {
      handlePredict();
    }
  }, [mlOnline]);

  const timeHoldout = modelInfo?.metrics.splits.time_holdout ?? null;
  const merchantHoldout = modelInfo?.metrics.splits.merchant_holdout ?? null;
  const importance = modelInfo?.featureImportance?.features ?? null;
  const topFeatures = importance ? Object.entries(importance).slice(0, 8) : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pt-4 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#242430]">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="bf-kicker text-neutral-400">[ 05 / ML PREDICTOR & INSIGHTS ]</span>
              <span className={`text-xs font-mono flex items-center gap-1.5 font-medium ${mlOnline ? 'text-emerald-400' : 'text-neutral-500'}`}>
                <span className={`w-2 h-2 rounded-full ${mlOnline ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                {mlOnline ? 'MODEL ONLINE & ACTIVE' : 'ML SERVICE INITIALIZING'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
              Predict Betting Syndicate & Platform Outcomes
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
              Input any business suspected of investing on betting platforms or fronting syndicate flows. The calibrated
              gradient-boosted decision tree model analyzes operational drift, transaction patterns, and graph connections to
              predict the outcome.
            </p>
          </div>
          <button onClick={onRefresh} className="bf-pill-btn text-xs flex items-center gap-2 shrink-0 bg-[#161622] hover:bg-[#222232] border-[#2c2c3e] text-white">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Model Status
          </button>
        </div>
      </section>

      {!modelInfo ? (
        <section className="bf-card rounded-2xl p-8 border-amber-500/30 bg-[#14120c] space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <WifiOff className="w-4 h-4" /> Connecting to ML Service
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            The Python ML scoring service is starting up on <span className="font-mono text-white">http://127.0.0.1:8001</span>.
            The Express backend proxy will automatically route all prediction requests once ready.
          </p>
        </section>
      ) : (
        <>
          {/* ==================== OUTCOME PREDICTOR SECTION ==================== */}
          <section className="rounded-2xl border border-[#2e2e42] bg-[#0d0d12] p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222230]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold">
                    LIVE MODEL INFERENCE
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">ANY BUSINESS ACCEPTED</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Business Betting Risk Evaluator
                </h2>
                <p className="text-xs text-neutral-400">
                  Select an existing business or type in any business you suspect is investing or laundering on betting platforms.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="inline-flex rounded-xl bg-[#161620] p-1 border border-[#2b2b3d] shrink-0">
                <button
                  type="button"
                  onClick={() => setInputMode('custom')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    inputMode === 'custom'
                      ? 'bg-white text-black shadow-md font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Custom Business
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('catalog')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    inputMode === 'catalog'
                      ? 'bg-white text-black shadow-md font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Choose from Directory
                </button>
              </div>
            </div>

            {/* Input Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inputMode === 'custom' ? (
                <>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-mono uppercase text-neutral-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Business Name
                    </label>
                    <input
                      type="text"
                      value={customBusinessName}
                      onChange={e => setCustomBusinessName(e.target.value)}
                      placeholder="e.g. Royal Flush Sports Betting Club, Bangalore Silks..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#14141e] border border-[#2e2e44] text-white text-xs font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-neutral-400">
                      Declared Category
                    </label>
                    <select
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#14141e] border border-[#2e2e44] text-white text-xs font-mono focus:border-indigo-400 focus:outline-none"
                    >
                      {DECLARED_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value} className="bg-[#14141e] text-white">
                          {cat.label} ({cat.mcc})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-[11px] font-mono uppercase text-neutral-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Select Business from Database
                  </label>
                  <select
                    value={selectedMerchantId}
                    onChange={e => setSelectedMerchantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#14141e] border border-[#2e2e44] text-white text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  >
                    <optgroup label="Simulated Monitored Merchants" className="bg-[#14141e] text-amber-300 font-bold">
                      {simulatedMerchants.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#14141e] text-white font-normal">
                          {m.id} · {m.displayName} ({m.categoryLabel}) — Prior Risk: {m.riskScore}/100
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Directory Commercial Merchants (OpenStreetMap)" className="bg-[#14141e] text-indigo-300 font-bold">
                      {realMerchants.slice(0, 80).map(m => (
                        <option key={m.id} value={m.id} className="bg-[#14141e] text-white font-normal">
                          {m.name} · {m.categoryLabel} ({m.id})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}
            </div>

            {/* Presets Row */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-mono uppercase text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Behavioral Pattern Presets
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PRESETS.map(p => {
                  const Icon = p.icon;
                  const isSelected = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#1e1c2e] border-indigo-500 shadow-md ring-1 ring-indigo-500'
                          : 'bg-[#14141e] border-[#29293a] hover:bg-[#1a1a26] text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-indigo-400" /> {p.label}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${p.badgeColor}`}>
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-snug">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Indicator Fine-Tuning Drawer / Sliders */}
            <div className="p-4 rounded-xl bg-[#14141e] border border-[#28283a] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Model Feature Indicators & Inflow Parameters
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  Adjust values to simulate behavioral drift
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Night-Time Volume:</span>
                    <span className="text-white font-bold">{Math.round(nightShare * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(nightShare * 100)}
                    onChange={e => {
                      setNightShare(Number(e.target.value) / 100);
                      setActivePreset('custom');
                    }}
                    className="w-full accent-indigo-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Round Deposit Ratio:</span>
                    <span className="text-white font-bold">{Math.round(roundRatio * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(roundRatio * 100)}
                    onChange={e => {
                      setRoundRatio(Number(e.target.value) / 100);
                      setActivePreset('custom');
                    }}
                    className="w-full accent-indigo-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Out-of-State Payers:</span>
                    <span className="text-white font-bold">{Math.round(outOfStateShare * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(outOfStateShare * 100)}
                    onChange={e => {
                      setOutOfStateShare(Number(e.target.value) / 100);
                      setActivePreset('custom');
                    }}
                    className="w-full accent-indigo-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Repeat Patron Retention:</span>
                    <span className="text-white font-bold">{Math.round(repeatRatio * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={80}
                    value={Math.round(repeatRatio * 100)}
                    onChange={e => {
                      setRepeatRatio(Number(e.target.value) / 100);
                      setActivePreset('custom');
                    }}
                    className="w-full accent-indigo-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Match-Hour Burst Ratio:</span>
                    <span className="text-white font-bold">{Math.round(burstRatio * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(burstRatio * 100)}
                    onChange={e => {
                      setBurstRatio(Number(e.target.value) / 100);
                      setActivePreset('custom');
                    }}
                    className="w-full accent-indigo-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Turnover Velocity Multiplier:</span>
                    <span className="text-white font-bold">{volumeMult.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={80}
                    value={Math.round(volumeMult * 10)}
                    onChange={e => {
                      setVolumeMult(Number(e.target.value) / 10);
                      setActivePreset('custom');
                    }}
                    className="w-full accent-indigo-400"
                  />
                </div>
              </div>
            </div>

            {/* Predict Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Live inference runs through Calibrated HistGradientBoosting Classifier
              </span>
              <button
                type="button"
                onClick={handlePredict}
                disabled={isScoring}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-lg hover:shadow-indigo-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isScoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    Predicting Outcome...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-black fill-black" />
                    Predict Outcome with Model
                  </>
                )}
              </button>
            </div>

            {scoreError && (
              <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <span className="font-bold block mb-0.5">Prediction Failed</span>
                  <span>{scoreError}</span>
                </div>
              </div>
            )}

            {/* PREDICTION OUTCOME CARD */}
            {score && (
              <div className="pt-4 border-t border-[#222230] space-y-5 animate-fade-in">
                {/* Verdict Banner */}
                <div
                  className={`p-5 rounded-2xl border ${
                    score.score >= 70
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-100'
                      : score.score >= 40
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-100'
                        : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest block opacity-75">
                        PREDICTION OUTCOME VERDICT
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                        {score.outcomeLabel || score.outcome || 'PREDICTION COMPLETED'}
                      </h3>
                      <p className="text-xs font-mono opacity-80 mt-1">
                        Business: <span className="font-bold underline text-white">{score.displayName || score.merchantId}</span> · Category:{' '}
                        <span className="text-white font-medium capitalize">
                          {DECLARED_CATEGORIES.find(c => c.value === score.category?.toLowerCase())?.label || score.category}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase opacity-75 block">Model Probability</span>
                        <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
                          {score.probability ?? Math.round(score.components.model)}%
                        </span>
                      </div>
                      <div className="h-10 w-px bg-white/20" />
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase opacity-75 block">Risk Score</span>
                        <span className="text-3xl font-black font-mono">
                          {score.score}/100
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation banner */}
                  {score.recommendation && (
                    <div className="p-3 rounded-xl bg-black/40 border border-white/15 text-xs space-y-1">
                      <span className="font-bold uppercase tracking-wide text-[10px] text-white flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        Model Recommended Action:
                      </span>
                      <p className="text-white/90 leading-relaxed font-mono text-[11px]">{score.recommendation}</p>
                    </div>
                  )}
                </div>

                {/* Reasons List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" /> Forensic Indicators & Signal Breakdown
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {score.reasons.map((reason, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#14141e] border border-[#28283a] text-xs text-neutral-300 font-mono leading-relaxed flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score Component Breakdown */}
                <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-[#14141e] border border-[#28283a]">
                    <span className="text-neutral-400 block text-[10px] uppercase">Calibrated ML Model</span>
                    <span className="text-xl font-bold text-white mt-0.5 block">{score.components.model}%</span>
                    <span className="text-[10px] text-neutral-500">Weight 45%</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#14141e] border border-[#28283a]">
                    <span className="text-neutral-400 block text-[10px] uppercase">Behavioral Rules</span>
                    <span className="text-xl font-bold text-white mt-0.5 block">{score.components.rule}/100</span>
                    <span className="text-[10px] text-neutral-500">Weight 35%</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#14141e] border border-[#28283a]">
                    <span className="text-neutral-400 block text-[10px] uppercase">Syndicate Graph Exposure</span>
                    <span className="text-xl font-bold text-white mt-0.5 block">{score.components.graph}/100</span>
                    <span className="text-[10px] text-neutral-500">Weight 20%</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ==================== MODEL METRICS & MODEL CARD ==================== */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bf-card rounded-2xl p-6 space-y-3 lg:col-span-2 bg-[#0d0d12] border border-[#242434]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="bf-kicker">[ MODEL ARCHITECTURE & VALIDATION ]</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">
                  {modelInfo.modelCard.evaluation.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">{modelInfo.modelCard.name}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] font-mono">
                {[
                  { label: 'Version', value: modelInfo.modelCard.version },
                  { label: 'Estimator', value: modelInfo.modelCard.modelType },
                  { label: 'Calibration', value: modelInfo.modelCard.calibration },
                  { label: 'Features', value: String(modelInfo.modelCard.featureCount) },
                  { label: 'Window', value: `${modelInfo.modelCard.windowDays}d` },
                  { label: 'Seed', value: String(modelInfo.metrics.seed) },
                ].map(cell => (
                  <div key={cell.label} className="p-3 rounded-xl bg-[#14141e] border border-[#242436]">
                    <span className="text-neutral-500 block text-[10px] uppercase">{cell.label}</span>
                    <span className="text-white block mt-0.5 truncate">{cell.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">{modelInfo.modelCard.syntheticDataWarning}</p>
              <p className="text-[11px] text-neutral-400">
                Trained at {new Date(modelInfo.modelCard.trainedAt).toLocaleString()} · provenance:{' '}
                <span className="font-mono">{String(modelInfo.provenance.dataFingerprint ?? 'n/a').slice(0, 16)}</span>
              </p>
            </div>

            <div className="bf-card rounded-2xl p-6 space-y-3 bg-[#0d0d12] border border-[#242434]">
              <span className="bf-kicker">[ MEASURED PERFORMANCE ]</span>
              <h3 className="text-base font-bold text-white">Evaluation Holdouts</h3>
              <div className="space-y-2 text-xs font-mono">
                {metricRows.map(row => (
                  <div key={row.key} className="flex justify-between items-center py-1.5 border-b border-[#242436]">
                    <span className="text-neutral-400">{row.label}</span>
                    <div className="space-x-3 text-right">
                      <span className="text-white font-bold">{pct(timeHoldout?.[row.key])}</span>
                      <span className="text-neutral-500 text-[10px]">time</span>
                      <span className="text-white font-bold ml-2">{pct(merchantHoldout?.[row.key])}</span>
                      <span className="text-neutral-500 text-[10px]">merch</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500">
                Reported on temporal and held-out merchant slices without data leakage.
              </p>
            </div>
          </section>

          {/* Feature Importance */}
          <section className="bf-card rounded-2xl p-6 space-y-3 bg-[#0d0d12] border border-[#242434]">
            <span className="bf-kicker">[ MODEL FEATURE IMPORTANCE ]</span>
            <h3 className="text-base font-bold text-white">Top Predictive Signals for Betting Platforms</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              {topFeatures.map(([featName, val]) => (
                <div key={featName} className="p-3 rounded-xl bg-[#14141e] border border-[#262638]">
                  <span className="text-neutral-400 block text-[10px] uppercase truncate">{featName.replace(/_/g, ' ')}</span>
                  <span className="text-white font-bold text-sm block mt-1">{(val * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default MLInsights;
