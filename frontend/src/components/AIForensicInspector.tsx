import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, FileText, FlaskConical, ShieldAlert, Sparkles, ChevronDown, Check, Search, Building2, MapPin, Store, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIInvestigationReport, RealMerchant, SimulatedMerchant } from '../types';
import { tierClasses, tierLabel } from '../merchantVisuals';

interface AIForensicInspectorProps {
  simulatedMerchants: SimulatedMerchant[];
  realMerchants?: RealMerchant[];
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
  realMerchants = [],
  selectedMerchantId,
  onSelectMerchant,
  report,
  isLoading,
  onRunInvestigation,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterSource, setFilterSource] = useState<'ALL' | 'SIM' | 'OSM'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  // Find currently selected merchant (simulated or real OSM)
  const selectedSim = simulatedMerchants.find(m => m.id === selectedMerchantId);
  const selectedReal = realMerchants.find(m => m.id === selectedMerchantId);
  const selected = selectedSim || selectedReal || simulatedMerchants[0] || (realMerchants[0] as any);

  const isReal = !!selectedReal && !selectedSim;

  // Filtered list for the dropdown
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const items: Array<{
      id: string;
      displayName: string;
      categoryLabel: string;
      subtitle: string;
      isReal: boolean;
      riskScore?: number;
      tier?: string;
    }> = [];

    if (filterSource === 'ALL' || filterSource === 'SIM') {
      simulatedMerchants.forEach(m => {
        if (!q || m.displayName.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.categoryLabel.toLowerCase().includes(q)) {
          items.push({
            id: m.id,
            displayName: m.displayName,
            categoryLabel: m.categoryLabel,
            subtitle: `${m.city}, ${m.state} · Risk: ${m.riskScore}/100`,
            isReal: false,
            riskScore: m.riskScore,
            tier: m.riskTier,
          });
        }
      });
    }

    if (filterSource === 'ALL' || filterSource === 'OSM') {
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
  }, [simulatedMerchants, realMerchants, filterSource, searchQuery]);

  const selectMerchant = (id: string) => {
    onSelectMerchant(id);
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pt-4 pb-2">
        <div className="pb-6 border-b border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2">
            <span className="bf-kicker text-neutral-400">[ 06 / AI FORENSIC INVESTIGATION ]</span>
            <span className={`text-xs font-mono flex items-center gap-1 ${isReal ? 'text-sky-300' : 'text-rose-300'}`}>
              {isReal ? <Store className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {isReal ? 'OPENSTREETMAP COMMERCIAL SHOP' : 'SIMULATED NETWORK MERCHANT'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
            Forensic AI Audit & Investigation
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
            Select any monitored simulated merchant or real OpenStreetMap commercial business to generate a comprehensive
            AI forensic analysis evaluating operational drift, payment velocity, statutory compliance, and regulatory risk.
          </p>
        </div>
      </section>

      {/* Dropdown Selector just like the Tabs Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0e0e14] border border-[#2b2b3d] shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
              Investigate Business
            </span>
            <span className="text-xs font-semibold text-white">
              {isReal ? 'OpenStreetMap Directory & Commercial Stores' : 'Simulated Syndicate & Monitored Merchants'}
            </span>
          </div>
        </div>

        {/* The Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`w-full sm:w-auto min-w-[280px] max-w-md flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all border shadow-md ${
              dropdownOpen
                ? 'bg-[#2a2a3a] text-white border-[#4d4d68]'
                : 'bg-[#181822] hover:bg-[#222230] text-white border-[#2e2e40]'
            }`}
            aria-expanded={dropdownOpen}
          >
            <div className="flex items-center space-x-2 truncate">
              <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                isReal ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {isReal ? 'OSM' : 'SIM'}
              </span>
              <span className="font-semibold tracking-tight truncate text-white">
                {selectedReal ? selectedReal.name : selectedSim?.displayName || 'Select Business'}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180 text-white' : 'text-neutral-400'}`} />
          </button>

          {/* Floating Dropdown Panel matching Tabs Dropdown */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 sm:left-auto left-0 mt-2 w-80 sm:w-[24rem] rounded-2xl bg-[#121218]/95 backdrop-blur-xl border border-[#2e2e42] shadow-2xl p-3 z-50 ring-1 ring-[#3b3b54]"
              >
                {/* Search Bar */}
                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name, category, ID..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#181824] border border-[#2e2e42] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 font-mono"
                    autoFocus
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-[#242436] pb-2 mb-2 gap-1 text-[11px] font-mono">
                  <button
                    onClick={() => setFilterSource('ALL')}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      filterSource === 'ALL' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    All ({simulatedMerchants.length + realMerchants.length})
                  </button>
                  <button
                    onClick={() => setFilterSource('SIM')}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      filterSource === 'SIM' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Simulated ({simulatedMerchants.length})
                  </button>
                  <button
                    onClick={() => setFilterSource('OSM')}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      filterSource === 'OSM' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    OSM Shops ({realMerchants.length})
                  </button>
                </div>

                {/* Scrollable list */}
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {filteredList.length === 0 ? (
                    <p className="text-xs text-neutral-500 font-mono text-center py-4">No matching businesses found.</p>
                  ) : (
                    filteredList.map(item => {
                      const isActive = item.id === selectedMerchantId;
                      return (
                        <motion.button
                          key={item.id}
                          whileHover={{ scale: 1.012, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                          onClick={() => selectMerchant(item.id)}
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
      </div>

      {/* Main Investigation Panel */}
      <div className="space-y-4">
        {selected && (
          <div className="bf-card rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-white">
                    {selectedReal ? selectedReal.name : selectedSim?.displayName}
                  </h2>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isReal
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                      : tierClasses(selectedSim?.riskTier ?? 'TIER_0_SAFE')
                  }`}>
                    {isReal ? 'OPENSTREETMAP SHOP · COMMERCIAL RECORD' : tierLabel(selectedSim?.riskTier ?? 'TIER_0_SAFE')}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-neutral-400">
                  {isReal
                    ? `${selectedReal?.categoryLabel} · ${selectedReal?.address || 'Bengaluru, Karnataka'} · OSM ID: ${selectedReal?.osmId}`
                    : `${selectedSim?.id} · ${selectedSim?.mccDescription} · ${selectedSim?.city}, ${selectedSim?.state}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRunInvestigation(selectedReal ? selectedReal.id : selectedSim!.id)}
                  disabled={isLoading}
                  className="bf-pill-btn bf-pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-40 shadow-lg cursor-pointer font-bold"
                >
                  <Bot className="w-3.5 h-3.5" /> {isLoading ? 'Running Forensic Audit...' : 'Generate AI Report'}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400">
              {isReal ? (
                <span className="flex items-center gap-1 text-emerald-400 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" /> Honest retail commercial baseline · Verified OpenStreetMap entity
                </span>
              ) : (
                <>
                  Rule-based drift score: <span className="font-mono text-white">{selectedSim?.riskScore}/100</span> ·
                  baseline source: <span className="font-mono">{selectedSim?.baseline.source}</span>
                </>
              )}
            </p>
          </div>
        )}

        {report ? (
          <div className="space-y-4">
            <div className="bf-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="bf-kicker">[ EXECUTIVE SUMMARY ]</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold">
                  {report.driftVerdict.split('_').join(' ')}
                </span>
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed">{report.executiveSummary}</p>
              <p className="text-[10px] font-mono text-neutral-500">
                {report.merchantId} · confidence {report.confidenceScore}/100 · verified behavioural model
              </p>
            </div>

            <div className="bf-card rounded-2xl p-5 space-y-3">
              <span className="bf-kicker flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-300" /> [ FORENSIC EVIDENCE & DRIFT FACTORS ]
              </span>
              <div className="space-y-2">
                {report.evidenceItems.map((item, index) => (
                  <div key={index} className={`p-3 rounded-xl border ${severityClasses[item.severity] ?? severityClasses.LOW}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{item.title}</span>
                      <span className="text-[9px] font-mono uppercase font-bold">{item.severity}</span>
                    </div>
                    <p className="text-[11px] mt-1 leading-relaxed opacity-90">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bf-card rounded-2xl p-5 space-y-3">
              <span className="bf-kicker flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> [ REGULATORY DOSSIER & NEXT STEPS ]
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
          <div className="bf-card rounded-2xl p-12 text-center text-neutral-500 text-xs font-mono">
            {isLoading ? 'Generating forensic AI investigation report...' : 'Select a merchant or shop above and click "Generate AI Report" to view findings.'}
          </div>
        )}
      </div>
    </div>
  );
};
