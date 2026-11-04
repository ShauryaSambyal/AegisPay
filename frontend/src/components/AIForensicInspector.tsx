import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  Gavel,
  Scale,
  ChevronDown
} from 'lucide-react';
import { Merchant, AIInvestigationReport } from '../types';

interface AIForensicInspectorProps {
  merchants: Merchant[];
  selectedMerchantId: string;
  onSelectMerchant: (id: string) => void;
  report: AIInvestigationReport | null;
  isLoading: boolean;
  onRunInvestigation: (id: string) => void;
}

export const AIForensicInspector: React.FC<AIForensicInspectorProps> = ({
  merchants,
  selectedMerchantId,
  onSelectMerchant,
  report,
  isLoading,
  onRunInvestigation
}) => {
  const [copied, setCopied] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const selectedMerchant = merchants.find(m => m.id === selectedMerchantId);

  // Close shop selector on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSelectorOpen(false);
      }
    };

    if (isSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelectorOpen]);

  const handleCopy = () => {
    if (!report) return;
    const textToCopy = `=== SUSPICIOUS TRANSACTION REPORT (STR) DOSSIER ===
Subject: ${report.merchantName} (ID: ${report.merchantId})
Date: ${report.investigationDate}
Verdict: ${report.driftVerdict}
Confidence Score: ${report.confidenceScore}%

EXECUTIVE SUMMARY:
${report.executiveSummary}

FIU CATEGORY:
${report.regulatoryDossier.fiuSuspiciousCategory}

STATUTORY NARRATIVE:
${report.regulatoryDossier.narrative}

STATUTORY VIOLATIONS:
${report.regulatoryDossier.statutoryViolations.map(v => `- ${v}`).join('\n')}

ACTIONABLE REMEDIATIONS:
${report.actionableRemediations.map((a, i) => `${i + 1}. ${a}`).join('\n')}
`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* Editorial Header */}
      <section className="relative pt-6 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center space-x-2">
              <span className="bf-kicker text-neutral-400">[ 05 / AI DEEP CHECK &amp; EVIDENCE ]</span>
              <span className="text-white/20">&bull;</span>
              <span className="text-xs font-mono text-emerald-400">GOOGLE GEMINI AUDITOR</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] font-sans">
              AI Store Investigation &amp; Bank Report.
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-2xl pt-2">
              Powered by Google Gemini. Evaluates unusual payment patterns, checks legal rules, and drafts a ready-to-file official report for payment compliance officers.
            </p>
          </div>

          {/* Merchant Selector & Audit Trigger */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="relative w-full sm:w-64" ref={selectorRef}>
              <button
                type="button"
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all duration-200 border ${
                  isSelectorOpen
                    ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/15 hover:border-white/30'
                }`}
                aria-expanded={isSelectorOpen}
                aria-label="Select a shop to investigate"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] uppercase tracking-widest hidden sm:inline shrink-0 ${isSelectorOpen ? 'text-neutral-600' : 'text-neutral-500'}`}>
                    Shop
                  </span>
                  <span className="font-semibold tracking-tight truncate">
                    {selectedMerchant?.name || 'Select a shop'}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ml-0.5 ${
                    isSelectorOpen ? 'rotate-180 text-black' : 'text-neutral-400'
                  }`}
                />
              </button>

              {/* Shop Selector Popover */}
              {isSelectorOpen && (
                <div className="absolute left-0 lg:left-auto lg:right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#09090C]/95 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/90 p-2 z-50 animate-dropdown-enter ring-1 ring-white/10">
                  
                  {/* Header bar */}
                  <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                      SHOPS &bull; {merchants.length} LISTED
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      READY
                    </span>
                  </div>

                  {/* Shop List */}
                  <div className="py-1.5 space-y-1 max-h-72 overflow-y-auto">
                    {merchants.map((m) => {
                      const isActive = selectedMerchantId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onSelectMerchant(m.id);
                            setIsSelectorOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition-all duration-200 ${
                            isActive
                              ? 'bg-white text-black font-semibold shadow-md'
                              : 'hover:bg-white/[0.07] text-neutral-300 hover:text-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className={`text-xs tracking-tight block truncate ${isActive ? 'text-black font-semibold' : 'text-white'}`}>
                              {m.name}
                            </span>
                            <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-neutral-600' : 'text-neutral-400'}`}>
                              {m.city}, {m.state} &bull; {m.isBettingFront ? 'Demo risk profile' : 'Safe (demo profile)'}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 ml-2">
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                              m.isBettingFront
                                ? isActive
                                  ? 'border-rose-600/30 bg-rose-600/10 text-rose-700 font-semibold'
                                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                : isActive
                                  ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 font-semibold'
                                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            }`}>
                              {m.isBettingFront ? 'RISK' : 'SAFE'}
                            </span>
                            {isActive && (
                              <Check className="w-4 h-4 text-black shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onRunInvestigation(selectedMerchantId)}
              disabled={isLoading}
              className="bf-pill-btn bf-pill-btn-primary text-xs py-2.5 px-5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Checking with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run AI Check</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Report Display */}
      {report ? (
        <div className="space-y-6">
          
          {/* Main Verdict Card */}
          <div className={`bf-card rounded-2xl p-6 sm:p-8 border transition-all ${
            report.driftVerdict === 'CONFIRMED_BETTING_FRONT'
              ? 'border-rose-500/40 bg-[#0E0A0C]'
              : report.driftVerdict === 'GENUINE_SEASONAL_SURGE'
              ? 'border-emerald-500/40 bg-[#0A0E0C]'
              : 'border-amber-500/40 bg-[#0E0C0A]'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className={`p-3.5 rounded-2xl shrink-0 ${
                  report.driftVerdict === 'CONFIRMED_BETTING_FRONT' ? 'bg-rose-500/20 text-rose-400' :
                  report.driftVerdict === 'GENUINE_SEASONAL_SURGE' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {report.driftVerdict === 'CONFIRMED_BETTING_FRONT' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : report.driftVerdict === 'GENUINE_SEASONAL_SURGE' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : (
                    <Scale className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                    CASE ID: AUD-{report.merchantId}-{report.investigationDate}
                  </span>
                  <h3 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                    {report.merchantName}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] uppercase font-mono font-bold px-3 py-1 rounded-full border ${
                      report.driftVerdict === 'CONFIRMED_BETTING_FRONT' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      report.driftVerdict === 'GENUINE_SEASONAL_SURGE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {report.driftVerdict === 'CONFIRMED_BETTING_FRONT' ? 'Demo: Confirmed Betting Front' :
                       report.driftVerdict === 'GENUINE_SEASONAL_SURGE' ? 'Genuine Surge (Safe)' :
                       report.driftVerdict.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      AI Certainty: <strong className="text-white">{report.confidenceScore}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCopy}
                className="bf-pill-btn flex items-center space-x-2 text-xs self-start sm:self-auto shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Report!' : 'Copy Bank Report'}</span>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-white/[0.08] text-xs text-neutral-200 leading-relaxed font-sans space-y-1">
              <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">
                Executive Summary (Plain English):
              </span>
              <p className="text-sm leading-relaxed">{report.executiveSummary}</p>
            </div>
          </div>

          {/* Evidence Grid */}
          <div className="bf-card rounded-2xl p-6 sm:p-8 space-y-4">
            <span className="bf-kicker">[ EVIDENCE FOUND ]</span>
            <h4 className="text-lg font-bold text-white tracking-tight">
              Unusual Activity &amp; Patterns Found
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.evidenceItems.map((item, idx) => {
                const isCrit = item.severity === 'CRITICAL';
                const isHigh = item.severity === 'HIGH';
                const isMed = item.severity === 'MEDIUM';

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-xl bg-neutral-900/50 border border-white/[0.06] flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">{item.title}</span>
                        <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isCrit ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                          isHigh ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                          isMed ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {item.severity}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regulatory STR Draft for FIU-IND */}
          <div className="bf-card rounded-2xl p-6 sm:p-8 space-y-4">
            <span className="bf-kicker text-amber-400">[ OFFICIAL BANK REPORT DRAFT ]</span>
            <h4 className="text-lg font-bold text-white tracking-tight">
              Official Bank Filing Report (FIU-IND Draft)
            </h4>

            <div className="bg-neutral-950 p-5 rounded-xl border border-white/[0.08] space-y-4 font-mono text-xs">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Suspicious Activity Category:</span>
                <span className="text-amber-300 font-semibold">{report.regulatoryDossier.fiuSuspiciousCategory}</span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Official Statement:</span>
                <p className="text-neutral-300 font-sans leading-relaxed text-xs mt-1">
                  {report.regulatoryDossier.narrative}
                </p>
              </div>

              {report.regulatoryDossier.statutoryViolations.length > 0 && (
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase mb-1">Laws Broken / Relevant Rules:</span>
                  <ul className="space-y-1 font-sans text-xs text-rose-300/90 list-disc list-inside">
                    {report.regulatoryDossier.statutoryViolations.map((v, idx) => (
                      <li key={idx}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Actionable Remediations */}
          <div className="bf-card rounded-2xl p-6 sm:p-8 space-y-4">
            <span className="bf-kicker text-emerald-400">[ NEXT STEPS ]</span>
            <h4 className="text-lg font-bold text-white tracking-tight">
              Recommended Fair Actions
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {report.actionableRemediations.map((action, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-neutral-900/50 border border-white/[0.06] flex items-start space-x-3">
                  <span className="font-mono text-emerald-400 font-bold shrink-0">0{idx + 1}.</span>
                  <span className="text-neutral-300 leading-relaxed">{action}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        <div className="bf-card rounded-2xl p-16 text-center text-neutral-400 space-y-4">
          <Bot className="w-12 h-12 text-neutral-600 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-white">No AI Investigation Run Yet</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            Choose a shop above and click &ldquo;Run AI Check&rdquo; to have Gemini analyze payment timing, payer locations, and draft an official bank report.
          </p>
        </div>
      )}

    </div>
  );
};
