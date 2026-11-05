import React from 'react';
import { Bot, FileText, FlaskConical, ShieldAlert, Sparkles } from 'lucide-react';
import { AIInvestigationReport, SimulatedMerchant } from '../types';
import { tierClasses, tierLabel } from '../merchantVisuals';

interface AIForensicInspectorProps {
  simulatedMerchants: SimulatedMerchant[];
  selectedMerchantId: string;
  onSelectMerchant: (merchantId: string) => void;
  report: AIInvestigationReport | null;
  isLoading: boolean;
  onRunInvestigation: (merchantId: string) => void;
}

const severityClasses: Record<string, string> = {
  CRITICAL: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  HIGH: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  MEDIUM: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  LOW: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
};

export const AIForensicInspector: React.FC<AIForensicInspectorProps> = ({
  simulatedMerchants,
  selectedMerchantId,
  onSelectMerchant,
  report,
  isLoading,
  onRunInvestigation,
}) => {
  const selected = simulatedMerchants.find(merchant => merchant.id === selectedMerchantId) ?? simulatedMerchants[0];

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pt-4 pb-2">
        <div className="pb-6 border-b border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2">
            <span className="bf-kicker text-neutral-400">[ 06 / SIMULATED INVESTIGATION ]</span>
            <span className="text-xs font-mono text-rose-300 flex items-center gap-1">
              <FlaskConical className="w-3 h-3" /> FICTIONAL MERCHANT
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
            Investigation note for a simulated merchant.
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
            Reports are generated for <span className="font-mono">SIM-*</span> merchants with fictional names. The
            narrative is a demo artefact, not a finding about any real business. Without a Gemini key the deterministic
            report engine is used.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bf-card rounded-2xl p-4 space-y-2">
          <span className="bf-kicker px-1">[ SIM MERCHANTS ]</span>
          <div className="max-h-[520px] overflow-y-auto space-y-1 pr-1">
            {simulatedMerchants.map(merchant => {
              const isActive = merchant.id === selected?.id;
              return (
                <button
                  key={merchant.id}
                  onClick={() => onSelectMerchant(merchant.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                    isActive ? 'bg-white text-black border-white' : 'bg-neutral-900/50 border-white/[0.06] hover:border-white/20 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{merchant.displayName}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ${
                      isActive ? 'bg-black/10 text-black' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}>
                      {merchant.riskScore}
                    </span>
                  </div>
                  <p className={`text-[10px] font-mono mt-0.5 ${isActive ? 'text-neutral-700' : 'text-neutral-500'}`}>
                    {merchant.id} · {merchant.categoryLabel}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected && (
            <div className="bf-card rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.displayName}</h2>
                  <p className="text-[11px] font-mono text-neutral-400">
                    {selected.id} · {selected.mccDescription} · {selected.city}, {selected.state}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${tierClasses(selected.riskTier)}`}>
                    {tierLabel(selected.riskTier)}
                  </span>
                  <button
                    onClick={() => onRunInvestigation(selected.id)}
                    disabled={isLoading}
                    className="bf-pill-btn bf-pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Bot className="w-3.5 h-3.5" /> {isLoading ? 'Generating...' : 'Generate report'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-neutral-400">
                Rule-based drift score: <span className="font-mono text-white">{selected.riskScore}/100</span> ·
                baseline source: <span className="font-mono">{selected.baseline.source}</span>
              </p>
            </div>
          )}

          {report ? (
            <div className="space-y-4">
              <div className="bf-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="bf-kicker">[ EXECUTIVE SUMMARY ]</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                    {report.driftVerdict.split('_').join(' ')}
                  </span>
                </div>
                <p className="text-sm text-neutral-200 leading-relaxed">{report.executiveSummary}</p>
                <p className="text-[10px] font-mono text-neutral-500">
                  {report.merchantId} · confidence {report.confidenceScore}/100 · simulated data only
                </p>
              </div>

              <div className="bf-card rounded-2xl p-5 space-y-3">
                <span className="bf-kicker flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-300" /> [ SIMULATED EVIDENCE ]
                </span>
                <div className="space-y-2">
                  {report.evidenceItems.map((item, index) => (
                    <div key={index} className={`p-3 rounded-xl border ${severityClasses[item.severity] ?? severityClasses.LOW}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{item.title}</span>
                        <span className="text-[9px] font-mono uppercase">{item.severity}</span>
                      </div>
                      <p className="text-[11px] mt-1 leading-relaxed opacity-90">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bf-card rounded-2xl p-5 space-y-3">
                <span className="bf-kicker flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> [ DOSSIER &amp; NEXT STEPS ]
                </span>
                <p className="text-xs text-neutral-300 leading-relaxed">{report.regulatoryDossier.narrative}</p>
                {report.regulatoryDossier.statutoryViolations.length > 0 && (
                  <ul className="text-[11px] text-neutral-400 list-disc pl-4 space-y-0.5">
                    {report.regulatoryDossier.statutoryViolations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
                <ul className="text-[11px] text-neutral-200 space-y-1">
                  {report.actionableRemediations.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Sparkles className="w-3 h-3 mt-0.5 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="bf-card rounded-2xl p-10 text-center text-neutral-500 text-xs font-mono">
              {isLoading ? 'Generating simulated report...' : 'Select a SIM merchant and generate a simulated report.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
