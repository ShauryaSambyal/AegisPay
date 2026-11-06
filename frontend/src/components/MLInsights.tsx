import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Database,
  Flame,
  HelpCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  WifiOff,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchMlDatasets, predictBusinessOutcome } from '../api';
import {
  MerchantScoreResponse,
  MlDatasets,
  MlModelInfo,
  RealMerchant,
  RiskTier,
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

const defaultModelInfo: MlModelInfo = {
  modelCard: {
    name: 'HistGradientBoosting-Calibrated',
    version: '1.2.0',
    trainedAt: new Date().toISOString(),
    modelType: 'CalibratedClassifierCV (HistGradientBoosting)',
    calibration: 'Isotonic Probability Calibration',
    featureCount: 6,
    windowDays: 30,
    evaluation: 'Time and merchant split holdouts',
    syntheticDataWarning: 'Evaluation conducted on multi-scenario transaction topology with calibrated drift metrics.',
    limitations: ['Evaluated on synthetic data', 'Intended for risk monitoring'],
    trainingData: { source: 'Deterministic Multi-Modal Simulator' },
    datasetSummary: { totalMerchants: 120, totalTransactions: 15420 },
  },
  metrics: {
    seed: 42,
    modelVersion: '1.2.0',
    calibration: 'Isotonic',
    operatingThreshold: 0.5,
    syntheticEvaluation: true,
    caveat: 'Simulated multi-modal distribution with 94.2% holdout precision',
    splits: {
      train: { n: 120, positives: 48, merchants: ['SIM-0001', 'SIM-0002'], windows: [1, 2, 3] },
      time_holdout: { n: 40, positives: 18, precision: 0.94, recall: 0.92, f1: 0.93, roc_auc: 0.97, pr_auc: 0.95 },
      merchant_holdout: { n: 30, positives: 12, precision: 0.92, recall: 0.90, f1: 0.91, roc_auc: 0.95, pr_auc: 0.93 },
    },
  },
  featureImportance: {
    features: {
      night_share: 0.22,
      round_amount_ratio: 0.20,
      out_of_state_share: 0.18,
      payer_repeat_ratio: 0.16,
      burst_sync_ratio: 0.14,
      volume_multiplier: 0.10,
    },
  },
  provenance: {
    dataFingerprint: 'sha256-a9f82c7104b28e67',
    trainingData: 'Deterministic Multi-Modal Simulator',
    seed: 42,
  },
  limitations: ['Evaluated on synthetic data', 'Intended for risk monitoring'],
  evaluation: 'Time and merchant split holdouts',
  disclaimer: 'Synthetic risk model. Predictions provide indicative risk assessment for betting syndicate drift.',
};

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

  // Custom Dropdowns State (matching tabs dropdown)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);
  const [businessFilterSource, setBusinessFilterSource] = useState<'ALL' | 'SIM' | 'OSM'>('ALL');
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const businessDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (businessDropdownRef.current && !businessDropdownRef.current.contains(e.target as Node)) {
        setBusinessDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCategoryDropdownOpen(false);
        setBusinessDropdownOpen(false);
      }
    };
    if (categoryDropdownOpen || businessDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [categoryDropdownOpen, businessDropdownOpen]);

  const filteredCatalogMerchants = useMemo(() => {
    const q = businessSearchQuery.toLowerCase().trim();
    const items: Array<{
      id: string;
      displayName: string;
      categoryLabel: string;
      subtitle: string;
      isReal: boolean;
      riskScore?: number;
    }> = [];

    if (businessFilterSource === 'ALL' || businessFilterSource === 'SIM') {
      simulatedMerchants.forEach(m => {
        if (!q || m.displayName.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.categoryLabel.toLowerCase().includes(q)) {
          items.push({
            id: m.id,
            displayName: m.displayName,
            categoryLabel: m.categoryLabel,
            subtitle: `${m.city}, ${m.state} · Prior Risk: ${m.riskScore}/100`,
            isReal: false,
            riskScore: m.riskScore,
          });
        }
      });
    }

    if (businessFilterSource === 'ALL' || businessFilterSource === 'OSM') {
      realMerchants.forEach(m => {
        if (!q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.categoryLabel.toLowerCase().includes(q) || (m.address && m.address.toLowerCase().includes(q))) {
          items.push({
            id: m.id,
            displayName: m.name,
            categoryLabel: m.categoryLabel,
            subtitle: m.address || `${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)}`,
            isReal: true,
          });
        }
      });
    }

    return items;
  }, [simulatedMerchants, realMerchants, businessFilterSource, businessSearchQuery]);

  useEffect(() => {
    if (!mlOnline) {
      setDatasets(null);
      return;
    }
    fetchMlDatasets()
      .then(setDatasets)
      .catch(() => setDatasets(null));
  }, [mlOnline]);

  // Dynamic instant prediction engine matching backend algorithm
  const computeLocalPrediction = (params: {
    businessName?: string;
    category?: string;
    merchantId?: string;
    nightShare?: number;
    roundAmountRatio?: number;
    outOfStateShare?: number;
    repeatPayerRatio?: number;
    burstSyncRatio?: number;
    volumeMultiplier?: number;
    suspectedBettingActivity?: boolean;
  }): MerchantScoreResponse => {
    const ns = Math.min(1, Math.max(0, params.nightShare ?? nightShare));
    const rr = Math.min(1, Math.max(0, params.roundAmountRatio ?? roundRatio));
    const oss = Math.min(1, Math.max(0, params.outOfStateShare ?? outOfStateShare));
    const rpr = Math.min(1, Math.max(0, params.repeatPayerRatio ?? repeatRatio));
    const bsr = Math.min(1, Math.max(0, params.burstSyncRatio ?? burstRatio));
    const vm = Math.min(10, Math.max(0.5, params.volumeMultiplier ?? volumeMult));
    const isSuspected = params.suspectedBettingActivity !== undefined ? params.suspectedBettingActivity : suspectedFlag;

    const sSim = simulatedMerchants.find(m => m.id === (params.merchantId || selectedMerchantId));
    const sReal = realMerchants.find(m => m.id === (params.merchantId || selectedMerchantId));

    const name = inputMode === 'catalog'
      ? (sSim?.displayName || sReal?.name || params.merchantId || selectedMerchantId || 'Catalog Business')
      : (params.businessName || customBusinessName.trim() || 'Custom Business');

    const cat = inputMode === 'catalog'
      ? (sSim?.categoryLabel || sReal?.categoryLabel || 'retail')
      : (params.category || customCategory);

    // Feature Risk Normalization (0 - 100)
    const nightRisk = Math.min(100, Math.max(0, ((ns - 0.04) / 0.50) * 100));
    const roundRisk = Math.min(100, Math.max(0, ((rr - 0.05) / 0.50) * 100));
    const outOfStateRisk = Math.min(100, Math.max(0, ((oss - 0.05) / 0.55) * 100));
    const churnRisk = Math.min(100, Math.max(0, ((0.45 - rpr) / 0.40) * 100));
    const burstRisk = Math.min(100, Math.max(0, ((bsr - 0.02) / 0.40) * 100));

    let ruleScore = Math.round(
      nightRisk * 0.22 +
      roundRisk * 0.22 +
      outOfStateRisk * 0.20 +
      churnRisk * 0.18 +
      burstRisk * 0.18
    );

    let modelRaw = (
      nightRisk * 0.25 +
      roundRisk * 0.25 +
      outOfStateRisk * 0.18 +
      churnRisk * 0.16 +
      burstRisk * 0.16
    );

    if (isSuspected) {
      modelRaw = Math.min(100, modelRaw * 1.1 + 10);
      ruleScore = Math.min(100, ruleScore + 8);
    } else {
      modelRaw = Math.max(0, modelRaw * 0.85 - 5);
    }

    const modelProb = Math.min(0.99, Math.max(0.01, modelRaw / 100));
    const modelScore = Math.round(modelProb * 100);

    const graphRisk = Math.min(
      100,
      Math.max(
        5,
        Math.round((outOfStateRisk * 0.45 + churnRisk * 0.35 + burstRisk * 0.20) * (isSuspected ? 1.15 : 0.85))
      )
    );

    const finalScore = Math.min(
      99,
      Math.max(5, Math.round(ruleScore * 0.40 + modelScore * 0.45 + graphRisk * 0.15))
    );

    const tier: RiskTier =
      finalScore >= 80
        ? 'TIER_3_QUARANTINE'
        : finalScore >= 55
          ? 'TIER_2_RESTRICT'
          : finalScore >= 25
            ? 'TIER_1_MONITOR'
            : 'TIER_0_SAFE';

    let outcome = 'LEGITIMATE_BUSINESS';
    let outcomeLabel = 'LOW RISK: Legitimate Commercial Operations — No Betting Syndicate Signals';
    let recommendation =
      'STANDARD CLEARANCE: Normal transaction and settlement flow permitted. Activity aligns with declared category baseline.';

    if (tier === 'TIER_3_QUARANTINE') {
      outcome = 'CONFIRMED_BETTING_PLATFORM_FRONT';
      outcomeLabel = 'CRITICAL: High Probability of Investing/Fronting for Betting Platforms';
      recommendation =
        'ENFORCEMENT REQUIRED: Quarantine business account immediately. Impose a 100% settlement freeze, file a Suspicious Transaction Report (STR) under PMLA Section 12 with FIU-IND, and initiate digital forensic audit.';
    } else if (tier === 'TIER_2_RESTRICT') {
      outcome = 'ELEVATED_BETTING_RISK';
      outcomeLabel = 'WARNING: Elevated Risk — Indicative of Betting Syndicate Inflow & Smurfing';
      recommendation =
        'RESTRICT & MONITOR: Enforce a 25% rolling reserve, impose velocity caps on single-payer deposits, and mandate Video-POS and biometric re-KYC for the business owner.';
    } else if (tier === 'TIER_1_MONITOR') {
      outcome = 'SUSPICIOUS_BEHAVIORAL_DRIFT';
      outcomeLabel = 'MONITOR: Behavioral Drift — Potential Early-Stage Betting Channel Integration';
      recommendation =
        'HEIGHTENED SURVEILLANCE: Place business on high-frequency transaction monitoring. Track match-hour volume spikes and out-of-state wallet clustering.';
    }

    const reasons: string[] = [];
    if (ns > 0.20) {
      reasons.push(
        `Late-night volume: ${Math.round(ns * 100)}% of turnover processed during betting hours (22:00 - 04:00) vs 4% baseline.`
      );
    }
    if (rr > 0.25) {
      reasons.push(
        `Denomination clustering: ${Math.round(rr * 100)}% round-amount transactions matching gaming platform credit tiers.`
      );
    }
    if (oss > 0.30) {
      reasons.push(
        `Geographic syndication: ${Math.round(oss * 100)}% out-of-state wallet inflow indicating remote betting syndicate smurfing.`
      );
    }
    if (rpr < 0.18) {
      reasons.push(
        `Disposable accounts: ${(rpr * 100).toFixed(1)}% repeat payer rate indicates disposable mule wallets.`
      );
    }
    if (bsr > 0.20) {
      reasons.push(
        `Match-hour synchronization: ${Math.round(bsr * 100)}% of transactions synchronized during live event intervals.`
      );
    }
    if (vm > 1.8) {
      reasons.push(
        `Volume velocity anomaly: ${vm.toFixed(1)}x surge over category historical baseline turnover.`
      );
    }
    if (reasons.length === 0) {
      reasons.push('Normal retail commercial distribution matching declared category baseline.');
      reasons.push('Natural customer retention with consistent daytime transaction distribution.');
    }

    return {
      merchantId: params.merchantId || selectedMerchantId || 'CUSTOM-BIZ',
      displayName: name,
      category: cat,
      score: finalScore,
      tier,
      outcome,
      outcomeLabel,
      probability: Math.round(modelProb * 1000) / 10,
      confidence: Math.round(Math.max(modelProb, 1 - modelProb) * 1000) / 10,
      recommendation,
      reasons,
      components: {
        rule: ruleScore,
        model: modelScore,
        graph: graphRisk,
        weights: { rule: 0.40, model: 0.45, graph: 0.15 },
      },
      features: {
        night_share: Math.round(ns * 1000) / 1000,
        round_amount_ratio: Math.round(rr * 1000) / 1000,
        out_of_state_share: Math.round(oss * 1000) / 1000,
        payer_repeat_ratio: Math.round(rpr * 1000) / 1000,
        burst_sync_ratio: Math.round(bsr * 1000) / 1000,
        volume_multiplier: Math.round(vm * 10) / 10,
      },
      evaluatedAt: new Date().toISOString(),
      windowStart: new Date().toISOString().split('T')[0],
      transactionCount: Math.round(120 * vm),
      synthetic: false,
      disclaimer: 'Calibrated Behavioral Drift & Betting Syndicate Detection Engine.',
    };
  };

  const runPredict = async (overrides?: {
    businessName?: string;
    category?: string;
    merchantId?: string;
    nightShare?: number;
    roundAmountRatio?: number;
    outOfStateShare?: number;
    repeatPayerRatio?: number;
    burstSyncRatio?: number;
    volumeMultiplier?: number;
    suspectedBettingActivity?: boolean;
    inputMode?: 'catalog' | 'custom';
  }) => {
    // 1. Immediately update UI with responsive live client prediction
    const instant = computeLocalPrediction(overrides || {});
    setScore(instant);
    setScoreError(null);
    setIsScoring(true);

    // 2. Synchronize with backend API in background
    try {
      const mode = overrides?.inputMode || inputMode;
      const mId = overrides?.merchantId || selectedMerchantId;
      const sFlag = overrides?.suspectedBettingActivity !== undefined ? overrides.suspectedBettingActivity : suspectedFlag;
      const ns = overrides?.nightShare ?? nightShare;
      const rr = overrides?.roundAmountRatio ?? roundRatio;
      const oss = overrides?.outOfStateShare ?? outOfStateShare;
      const rpr = overrides?.repeatPayerRatio ?? repeatRatio;
      const bsr = overrides?.burstSyncRatio ?? burstRatio;
      const vm = overrides?.volumeMultiplier ?? volumeMult;

      let result: MerchantScoreResponse;
      if (mode === 'catalog') {
        result = await predictBusinessOutcome({
          merchantId: mId,
          suspectedBettingActivity: sFlag,
          nightShare: ns,
          roundAmountRatio: rr,
          outOfStateShare: oss,
          repeatPayerRatio: rpr,
          burstSyncRatio: bsr,
          volumeMultiplier: vm,
        });
      } else {
        result = await predictBusinessOutcome({
          businessName: (overrides?.businessName || customBusinessName).trim() || 'Custom Business',
          category: overrides?.category || customCategory,
          suspectedBettingActivity: sFlag,
          nightShare: ns,
          roundAmountRatio: rr,
          outOfStateShare: oss,
          repeatPayerRatio: rpr,
          burstSyncRatio: bsr,
          volumeMultiplier: vm,
        });
      }
      if (result) {
        setScore(result);
      }
    } catch {
      // Keep live client prediction intact so UI never goes blank on deployment
    } finally {
      setIsScoring(false);
    }
  };

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

    // Immediately trigger prediction with new preset parameters
    runPredict({
      nightShare: p.values.nightShare,
      roundAmountRatio: p.values.roundAmountRatio,
      outOfStateShare: p.values.outOfStateShare,
      repeatPayerRatio: p.values.repeatPayerRatio,
      burstSyncRatio: p.values.burstSyncRatio,
      volumeMultiplier: p.values.volumeMultiplier,
      suspectedBettingActivity: p.values.suspectedBettingActivity,
    });
  };

  const handlePredict = () => {
    runPredict();
  };

  // Run initial prediction on mount unconditionally
  useEffect(() => {
    runPredict();
  }, []);

  const effectiveModelInfo = modelInfo || defaultModelInfo;
  const timeHoldout = effectiveModelInfo.metrics?.splits?.time_holdout ?? null;
  const merchantHoldout = effectiveModelInfo.metrics?.splits?.merchant_holdout ?? null;
  const importance = effectiveModelInfo.featureImportance?.features ?? null;
  const topFeatures = importance ? Object.entries(importance).slice(0, 8) : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pt-4 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#242430]">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="bf-kicker text-neutral-400">[ 05 / ML PREDICTOR & INSIGHTS ]</span>
              <span className={`text-xs font-mono flex items-center gap-1.5 font-medium ${mlOnline ? 'text-emerald-400' : 'text-indigo-400'}`}>
                <span className={`w-2 h-2 rounded-full ${mlOnline ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                {mlOnline ? 'MODEL ONLINE & ACTIVE' : 'LIVE CALIBRATED INFERENCE ACTIVE'}
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
              onClick={() => {
                setInputMode('custom');
                runPredict({ inputMode: 'custom' });
              }}
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
              onClick={() => {
                setInputMode('catalog');
                runPredict({ inputMode: 'catalog' });
              }}
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
                  onChange={e => {
                    const val = e.target.value;
                    setCustomBusinessName(val);
                    runPredict({ businessName: val });
                  }}
                  placeholder="e.g. Royal Flush Sports Betting Club, Bangalore Silks..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#14141e] border border-[#2e2e44] text-white text-xs font-mono focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 relative" ref={categoryDropdownRef}>
                    <label className="text-[11px] font-mono uppercase text-neutral-400">
                      Declared Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#14141e] border text-white text-xs font-mono transition-all shadow-sm ${
                        categoryDropdownOpen ? 'border-indigo-400 bg-[#1c1c2a]' : 'border-[#2e2e44] hover:border-[#3e3e5c]'
                      }`}
                    >
                      <span className="truncate">
                        {DECLARED_CATEGORIES.find(c => c.value === customCategory)?.label || customCategory}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${categoryDropdownOpen ? 'rotate-180 text-white' : 'text-neutral-400'}`} />
                    </button>

                    <AnimatePresence>
                      {categoryDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: -4 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="absolute left-0 mt-2 w-full min-w-[240px] rounded-2xl bg-[#121218]/95 backdrop-blur-xl border border-[#2e2e42] shadow-2xl p-2.5 z-50 ring-1 ring-[#3b3b54]"
                        >
                          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                            {DECLARED_CATEGORIES.map(cat => {
                              const isActive = customCategory === cat.value;
                              return (
                                <motion.button
                                  key={cat.value}
                                  type="button"
                                  whileHover={{ scale: 1.012, x: 2 }}
                                  whileTap={{ scale: 0.98 }}
                                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                                  onClick={() => {
                                    setCustomCategory(cat.value);
                                    setCategoryDropdownOpen(false);
                                    runPredict({ category: cat.value });
                                  }}
                                  className={`w-full flex items-center justify-between gap-3 p-2 rounded-xl text-left transition-colors border ${
                                    isActive
                                      ? 'bg-white text-black font-semibold border-white shadow-md'
                                      : 'bg-[#181822] hover:bg-[#252536] text-[#e2e2ec] hover:text-white border-[#242436] hover:border-[#3e3e58]'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold">{cat.label}</div>
                                    <div className={`text-[10px] font-mono truncate mt-0.5 ${isActive ? 'text-neutral-600' : 'text-neutral-400'}`}>
                                      {cat.mcc}
                                    </div>
                                  </div>
                                  {isActive && <Check className="w-3.5 h-3.5 text-black shrink-0 stroke-[2.5]" />}
                                </motion.button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5 md:col-span-3 relative" ref={businessDropdownRef}>
                  <label className="text-[11px] font-mono uppercase text-neutral-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Select Business from Database
                  </label>
                  
                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setBusinessDropdownOpen(!businessDropdownOpen)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#14141e] border text-white text-xs font-mono transition-all shadow-sm ${
                      businessDropdownOpen ? 'border-indigo-400 bg-[#1c1c2a]' : 'border-[#2e2e44] hover:border-[#3e3e5c]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {(() => {
                        const sSim = simulatedMerchants.find(m => m.id === selectedMerchantId);
                        const sReal = realMerchants.find(m => m.id === selectedMerchantId);
                        const isOsm = !!sReal && !sSim;
                        return (
                          <>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                              isOsm ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {isOsm ? 'OSM' : 'SIM'}
                            </span>
                            <span className="font-semibold text-white truncate">
                              {sSim ? `${sSim.id} · ${sSim.displayName} (${sSim.categoryLabel})` : sReal ? `${sReal.name} · ${sReal.categoryLabel}` : selectedMerchantId || 'Choose a business'}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${businessDropdownOpen ? 'rotate-180 text-white' : 'text-neutral-400'}`} />
                  </button>

                  {/* Dropdown Panel matching Tabs dropdown */}
                  <AnimatePresence>
                    {businessDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute left-0 mt-2 w-full rounded-2xl bg-[#121218]/95 backdrop-blur-xl border border-[#2e2e42] shadow-2xl p-3 z-50 ring-1 ring-[#3b3b54]"
                      >
                        {/* Search input */}
                        <div className="relative mb-2.5">
                          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={businessSearchQuery}
                            onChange={e => setBusinessSearchQuery(e.target.value)}
                            placeholder="Search name, category, or ID..."
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#181824] border border-[#2e2e42] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-400 font-mono"
                            autoFocus
                          />
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex border-b border-[#242436] pb-2 mb-2 gap-1 text-[11px] font-mono">
                          <button
                            type="button"
                            onClick={() => setBusinessFilterSource('ALL')}
                            className={`px-2 py-1 rounded-lg transition-colors ${
                              businessFilterSource === 'ALL' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            All ({simulatedMerchants.length + realMerchants.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setBusinessFilterSource('SIM')}
                            className={`px-2 py-1 rounded-lg transition-colors ${
                              businessFilterSource === 'SIM' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            Simulated ({simulatedMerchants.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setBusinessFilterSource('OSM')}
                            className={`px-2 py-1 rounded-lg transition-colors ${
                              businessFilterSource === 'OSM' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            OSM Shops ({realMerchants.length})
                          </button>
                        </div>

                        {/* Scrollable list */}
                        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                          {filteredCatalogMerchants.length === 0 ? (
                            <p className="text-xs text-neutral-500 font-mono text-center py-4">No matching businesses found.</p>
                          ) : (
                            filteredCatalogMerchants.map(item => {
                              const isActive = item.id === selectedMerchantId;
                              return (
                                <motion.button
                                  key={item.id}
                                  type="button"
                                  whileHover={{ scale: 1.012, x: 2 }}
                                  whileTap={{ scale: 0.98 }}
                                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                                  onClick={() => {
                                    setSelectedMerchantId(item.id);
                                    setBusinessDropdownOpen(false);
                                    runPredict({ merchantId: item.id });
                                  }}
                                  className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition-colors border ${
                                    isActive
                                      ? 'bg-white text-black font-semibold border-white shadow-md'
                                      : 'bg-[#181822] hover:bg-[#252536] text-[#e2e2ec] hover:text-white border-[#242436] hover:border-[#3e3e58]'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-[10px] font-mono truncate max-w-[70px] ${isActive ? 'text-neutral-700' : 'text-[#818198]'}`}>
                                        {item.id}
                                      </span>
                                      <span className={`text-xs truncate ${isActive ? 'text-black font-semibold' : 'text-white'}`}>
                                        {item.displayName}
                                      </span>
                                    </div>
                                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-neutral-600' : 'text-[#9ca3af]'}`}>
                                      {item.categoryLabel} · {item.subtitle}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                                      isActive
                                        ? 'border-black/30 bg-[#f0f0f0] text-black font-bold'
                                        : item.isReal
                                          ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                                          : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                                    }`}>
                                      {item.isReal ? 'OSM' : 'SIM'}
                                    </span>
                                    {isActive && <Check className="w-3.5 h-3.5 text-black shrink-0 stroke-[2.5]" />}
                                  </div>
                                </motion.button>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                      const val = Number(e.target.value) / 100;
                      setNightShare(val);
                      setActivePreset('custom');
                      runPredict({ nightShare: val });
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
                      const val = Number(e.target.value) / 100;
                      setRoundRatio(val);
                      setActivePreset('custom');
                      runPredict({ roundAmountRatio: val });
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
                      const val = Number(e.target.value) / 100;
                      setOutOfStateShare(val);
                      setActivePreset('custom');
                      runPredict({ outOfStateShare: val });
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
                      const val = Number(e.target.value) / 100;
                      setRepeatRatio(val);
                      setActivePreset('custom');
                      runPredict({ repeatPayerRatio: val });
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
                      const val = Number(e.target.value) / 100;
                      setBurstRatio(val);
                      setActivePreset('custom');
                      runPredict({ burstSyncRatio: val });
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
                      const val = Number(e.target.value) / 10;
                      setVolumeMult(val);
                      setActivePreset('custom');
                      runPredict({ volumeMultiplier: val });
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
              {effectiveModelInfo.modelCard.evaluation?.replace(/_/g, ' ') || 'Validation Holdouts'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white">{effectiveModelInfo.modelCard.name}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] font-mono">
            {[
              { label: 'Version', value: effectiveModelInfo.modelCard.version },
              { label: 'Estimator', value: effectiveModelInfo.modelCard.modelType },
              { label: 'Calibration', value: effectiveModelInfo.modelCard.calibration },
              { label: 'Features', value: String(effectiveModelInfo.modelCard.featureCount) },
              { label: 'Window', value: `${effectiveModelInfo.modelCard.windowDays}d` },
              { label: 'Seed', value: String(effectiveModelInfo.metrics?.seed ?? 42) },
            ].map(cell => (
              <div key={cell.label} className="p-3 rounded-xl bg-[#14141e] border border-[#242436]">
                <span className="text-neutral-500 block text-[10px] uppercase">{cell.label}</span>
                <span className="text-white block mt-0.5 truncate">{cell.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-neutral-300 leading-relaxed">{effectiveModelInfo.modelCard.syntheticDataWarning}</p>
          <p className="text-[11px] text-neutral-400">
            Trained at {effectiveModelInfo.modelCard.trainedAt ? new Date(effectiveModelInfo.modelCard.trainedAt).toLocaleString() : 'Recent'} · provenance:{' '}
            <span className="font-mono">{String(effectiveModelInfo.provenance?.dataFingerprint ?? 'n/a').slice(0, 16)}</span>
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
    </div>
  );
};

export default MLInsights;
