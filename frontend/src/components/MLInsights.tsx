import React, { useEffect, useState } from 'react';
import { AlertTriangle, Cpu, Database, FlaskConical, RefreshCw, WifiOff } from 'lucide-react';
import { fetchMlDatasets, scoreMerchant } from '../api';
import {
  MerchantScoreResponse,
  MlDatasets,
  MlModelInfo,
  SimulatedMerchant,
  SplitMetrics,
} from '../types';
import { tierClasses, tierLabel } from '../merchantVisuals';

interface MLInsightsProps {
  simulatedMerchants: SimulatedMerchant[];
  modelInfo: MlModelInfo | null;
  mlOnline: boolean;
  onRefresh: () => void;
}

const pct = (value: number | null | undefined): string =>
  value === null || value === undefined ? 'not computed' : `${(value * 100).toFixed(1)}%`;

const metricRows: { key: keyof SplitMetrics; label: string }[] = [
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1', label: 'F1' },
  { key: 'roc_auc', label: 'ROC-AUC' },
  { key: 'pr_auc', label: 'PR-AUC' },
];

export const MLInsights: React.FC<MLInsightsProps> = ({
  simulatedMerchants,
  modelInfo,
  mlOnline,
  onRefresh,
}) => {
  const [datasets, setDatasets] = useState<MlDatasets | null>(null);
  const [selectedId, setSelectedId] = useState<string>(simulatedMerchants[0]?.id ?? 'SIM-0001');
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

  useEffect(() => {
    if (!selectedId && simulatedMerchants[0]) setSelectedId(simulatedMerchants[0].id);
  }, [simulatedMerchants, selectedId]);

  const runScore = async () => {
    setIsScoring(true);
    setScoreError(null);
    try {
      setScore(await scoreMerchant(selectedId));
    } catch (error) {
      setScore(null);
      setScoreError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsScoring(false);
    }
  };

  const timeHoldout = modelInfo?.metrics.splits.time_holdout ?? null;
  const merchantHoldout = modelInfo?.metrics.splits.merchant_holdout ?? null;
  const importance = modelInfo?.featureImportance?.features ?? null;
  const topFeatures = importance ? Object.entries(importance).slice(0, 8) : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pt-4 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="bf-kicker text-neutral-400">[ 05 / ML INSIGHTS ]</span>
              <span className={`text-xs font-mono flex items-center gap-1 ${mlOnline ? 'text-emerald-300' : 'text-neutral-500'}`}>
                <Cpu className="w-3 h-3" /> {mlOnline ? 'LIVE FROM /api/ml' : 'ML SERVICE OFFLINE'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
              Model card, measured metrics, honest limits.
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
              Everything below is fetched from the FastAPI service through the Express proxy. Nothing is hardcoded, and
              every metric is labelled as measured on synthetic data.
            </p>
          </div>
          <button onClick={onRefresh} className="bf-pill-btn text-xs flex items-center gap-2 shrink-0">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </section>

      {!mlOnline || !modelInfo ? (
        <section className="bf-card rounded-2xl p-8 border-amber-500/30 bg-amber-950/10 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <WifiOff className="w-4 h-4" /> ML service is offline
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            No metrics are shown because they must come from the service. Start the stack with{' '}
            <span className="font-mono text-neutral-100">npm run dev</span>, or run the ML service directly:
          </p>
          <pre className="text-[11px] font-mono bg-black/50 border border-white/10 rounded-xl p-3 overflow-x-auto text-neutral-300">
ml-service\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
          </pre>
          <p className="text-[11px] text-neutral-400">
            Scoring, the model card and the dataset provenance panel stay unavailable until it answers{' '}
            <span className="font-mono">/health</span>.
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bf-card rounded-2xl p-6 space-y-3 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="bf-kicker">[ MODEL CARD ]</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
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
                  <div key={cell.label} className="p-3 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                    <span className="text-neutral-500 block text-[10px] uppercase">{cell.label}</span>
                    <span className="text-white block mt-0.5 truncate">{cell.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">{modelInfo.modelCard.syntheticDataWarning}</p>
              <p className="text-[11px] text-neutral-400">
                Trained at {new Date(modelInfo.modelCard.trainedAt).toLocaleString()} · provenance:{' '}
                <span className="font-mono">{String(modelInfo.provenance.dataFingerprint ?? 'n/a').slice(0, 16)}</span>
              </p>
            </div>

            <div className="bf-card rounded-2xl p-6 space-y-3">
              <span className="bf-kicker">[ LIMITATIONS ]</span>
              <ul className="space-y-2 text-[11px] text-neutral-300 leading-relaxed list-disc pl-4">
                {modelInfo.limitations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { name: 'Time holdout (future windows)', data: timeHoldout },
              { name: 'Merchant holdout (unseen SIM merchants)', data: merchantHoldout },
            ].map(slice => (
              <div key={slice.name} className="bf-card rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="bf-kicker">[ {slice.name.toUpperCase()} ]</span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    n={slice.data?.n ?? 0} · positives={slice.data?.positives ?? 0}
                  </span>
                </div>
                {slice.data ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                    {metricRows.map(row => (
                      <div key={row.key} className="p-3 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                        <span className="text-neutral-500 block text-[10px] uppercase">{row.label}</span>
                        <span className="text-white font-bold block mt-0.5">
                          {pct(slice.data ? (slice.data[row.key] as number | null) : null)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">No rows in this slice.</p>
                )}
                {slice.data?.notes?.length ? (
                  <p className="text-[10px] text-neutral-500 font-mono">{slice.data.notes.join(' ')}</p>
                ) : null}
                {slice.data?.confusion_matrix ? (
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Confusion matrix [[TN, FP], [FN, TP]] = {JSON.stringify(slice.data.confusion_matrix)}
                  </p>
                ) : null}
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bf-card rounded-2xl p-6 space-y-3">
              <span className="bf-kicker">[ FEATURE IMPORTANCE ]</span>
              {topFeatures.length ? (
                <div className="space-y-2">
                  {topFeatures.map(([name, value]) => {
                    const max = Math.max(...topFeatures.map(([, v]) => Math.abs(v)), 0.0001);
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                          <span>{name}</span>
                          <span>{value.toFixed(4)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5">
                          <div
                            className="h-1.5 rounded-full bg-emerald-400/70"
                            style={{ width: `${Math.min(100, (Math.abs(value) / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-neutral-500 font-mono">
                    method: {modelInfo.featureImportance?.method ?? 'unknown'} · permutation importance on the holdout slice
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">No importance artifact available.</p>
              )}
            </div>

            <div className="bf-card rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-sky-300" />
                <span className="bf-kicker">[ DATASET PROVENANCE ]</span>
              </div>
              <p className="text-[11px] text-neutral-400">{datasets?.trainingProvenance ?? 'Unavailable.'}</p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(datasets?.datasets ?? []).map(entry => (
                  <div key={entry.name} className="p-3 rounded-xl bg-neutral-900/60 border border-white/[0.06] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{entry.name}</span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                        entry.usedForTraining
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-neutral-600/40 bg-neutral-700/20 text-neutral-400'
                      }`}>
                        {entry.usedForTraining ? 'USED FOR TRAINING' : 'NOT USED FOR TRAINING'}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-neutral-400">{entry.license}</p>
                    <p className="text-[10px] text-neutral-500 leading-relaxed">{entry.access}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bf-card rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="bf-kicker">[ SCORE EXPLORER ]</span>
                <h2 className="text-lg font-bold text-white mt-1">Score a SIM merchant through the proxy</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-300 flex items-center gap-1">
                <FlaskConical className="w-3 h-3" /> SIM-* only
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedId}
                onChange={event => setSelectedId(event.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white font-mono"
              >
                {simulatedMerchants.map(merchant => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.id} · {merchant.displayName}
                  </option>
                ))}
              </select>
              <button onClick={runScore} disabled={isScoring} className="bf-pill-btn bf-pill-btn-primary text-xs px-4 disabled:opacity-40">
                {isScoring ? 'Scoring...' : 'POST /api/ml/score/merchant'}
              </button>
            </div>

            {scoreError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {scoreError}
              </div>
            )}

            {score && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-3xl font-bold font-mono text-white">{score.score}/100</span>
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${tierClasses(score.tier)}`}>
                    {tierLabel(score.tier)}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    window {score.windowStart} · {score.transactionCount} simulated payments
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  {(['rule', 'model', 'graph'] as const).map(key => (
                    <div key={key} className="p-3 rounded-xl bg-neutral-900/60 border border-white/[0.06]">
                      <span className="text-neutral-500 block text-[10px] uppercase">{key}</span>
                      <span className="text-white font-bold">{score.components[key]}</span>
                      <span className="text-neutral-500 block text-[9px]">weight {score.components.weights[key]}</span>
                    </div>
                  ))}
                </div>
                <ul className="space-y-1.5">
                  {score.reasons.map((reason, index) => (
                    <li key={index} className="text-[11px] text-neutral-300 bg-neutral-950 border border-white/[0.06] rounded-lg p-2.5">
                      {reason}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-neutral-500">{score.disclaimer}</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
