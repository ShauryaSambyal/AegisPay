import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, ShieldCheck, FlaskConical, Cpu } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  backendConnected: boolean;
  mlOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, backendConnected, mlOnline }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', onClick);
      document.addEventListener('keydown', onKey);
    }
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const navItems = [
    { id: 'overview', num: '01', label: 'Overview', desc: 'Simulated risk KPIs and live flags', badge: null },
    { id: 'stream', num: '02', label: 'Simulated Payments', desc: 'Scenario injection and payment feed', badge: 'SIM' },
    { id: 'syndicate', num: '03', label: 'Syndicate Graph', desc: 'SIM-only payer and merchant network', badge: 'SIM' },
    { id: 'merchants', num: '04', label: 'Directory & Controls', desc: 'Real OSM (display only) + SIM risk table', badge: null },
    { id: 'ml-insights', num: '05', label: 'ML Insights', desc: 'Model card, measured metrics, datasets', badge: 'ML' },
    { id: 'ai-investigator', num: '06', label: 'Investigation', desc: 'Simulated forensic report for a SIM merchant', badge: 'SIM' },
    { id: 'api-config', num: '07', label: 'API & Data Sources', desc: 'Endpoints, keys and provenance', badge: null },
  ];

  const current = navItems.find(item => item.id === activeTab) ?? navItems[0];

  const select = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070708]/92 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          <div className="flex items-center space-x-3 sm:space-x-5">
            <div
              className="flex items-center space-x-2.5 cursor-pointer group"
              onClick={() => select('overview')}
              title="Return to Overview"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center text-black shadow-md group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.5]" />
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white">AEGISPAY</span>
                <span className="text-[9px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded-full border border-white/20 text-neutral-300">
                  SENTINEL
                </span>
              </div>
            </div>

            <div className="hidden sm:block h-6 w-px bg-white/10" />

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-mono transition-all border ${
                  isOpen ? 'bg-white text-black border-white' : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/15'
                }`}
                aria-expanded={isOpen}
                aria-label="Toggle navigation views"
              >
                <span className={`text-[10px] hidden md:inline ${isOpen ? 'text-neutral-700' : 'text-neutral-400'}`}>
                  {current.num} /
                </span>
                <span className="font-semibold tracking-tight truncate max-w-[140px] sm:max-w-none">{current.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-black' : 'text-neutral-400'}`} />
              </button>

              {isOpen && (
                <div className="absolute left-0 mt-2 w-72 sm:w-[23rem] rounded-2xl bg-[#09090C]/97 backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-50 ring-1 ring-white/10">
                  <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                      NAVIGATION · {navItems.length} VIEWS
                    </span>
                    <span className={`text-[10px] font-mono flex items-center gap-1 ${backendConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${backendConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      API {backendConnected ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="py-1.5 space-y-1">
                    {navItems.map(item => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => select(item.id)}
                          className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition-all ${
                            isActive ? 'bg-white text-black font-semibold' : 'hover:bg-white/[0.07] text-neutral-300 hover:text-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] font-mono ${isActive ? 'text-neutral-700' : 'text-neutral-500'}`}>{item.num}</span>
                              <span className={`text-xs ${isActive ? 'text-black font-semibold' : 'text-white'}`}>{item.label}</span>
                            </div>
                            <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-neutral-600' : 'text-neutral-400'}`}>{item.desc}</p>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0 ml-2">
                            {item.badge && (
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                                isActive ? 'border-black/20 bg-black/10 text-black' : 'border-white/20 bg-white/5 text-neutral-300'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                            {isActive && <Check className="w-4 h-4 text-black shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <FlaskConical className="w-3 h-3" /> SIMULATED RISK
            </span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${
              mlOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-neutral-800/60 border-white/10 text-neutral-400'
            }`}>
              <Cpu className="w-3 h-3" /> ML {mlOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
