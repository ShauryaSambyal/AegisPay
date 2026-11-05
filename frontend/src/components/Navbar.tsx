import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  backendConnected: boolean;
  mlOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, backendConnected }) => {
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
    { id: 'overview', num: '01', label: 'Overview', desc: 'Risk KPIs, live flags & syndicate stats', badge: null },
    { id: 'stream', num: '02', label: 'Payment Stream', desc: 'Live payments and scenario injection', badge: 'FEED' },
    { id: 'syndicate', num: '03', label: 'Syndicate Graph', desc: 'Payer and merchant syndicate network', badge: 'GRAPH' },
    { id: 'merchants', num: '04', label: 'Directory & Controls', desc: 'All commercial & risk-monitored businesses', badge: null },
    { id: 'ml-insights', num: '05', label: 'ML Betting Predictor', desc: 'Predict betting syndicate outcomes for any business', badge: 'ML' },
    { id: 'ai-investigator', num: '06', label: 'Investigation', desc: 'Forensic AI audit report for any business', badge: 'AI' },
  ];

  const current = navItems.find(item => item.id === activeTab) ?? navItems[0];

  const select = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070708] border-b border-[#242430]">
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
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-mono transition-all border shadow-sm ${
                  isOpen ? 'bg-[#2a2a3a] text-white border-[#4d4d68]' : 'bg-[#181822] hover:bg-[#222230] text-white border-[#2e2e40]'
                }`}
                aria-expanded={isOpen}
                aria-label="Toggle navigation views"
              >
                <span className={`text-[10px] hidden md:inline ${isOpen ? 'text-neutral-300' : 'text-neutral-400'}`}>
                  {current.num} /
                </span>
                <span className="font-semibold tracking-tight truncate max-w-[140px] sm:max-w-none">{current.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-neutral-400'}`} />
              </button>

              {isOpen && (
                <div className="absolute left-0 mt-2 w-72 sm:w-[23rem] rounded-2xl bg-[#121218] border border-[#2e2e42] shadow-2xl p-2.5 z-50 ring-1 ring-[#3b3b54]">
                  <div className="px-3.5 py-2.5 rounded-xl bg-[#1c1c28] border border-[#2b2b3d] flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#a1a1b5] font-semibold">
                      NAVIGATION · {navItems.length} VIEWS
                    </span>
                    <span className={`text-[10px] font-mono flex items-center gap-1.5 font-medium ${backendConnected ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                      <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
                      API {backendConnected ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {navItems.map(item => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => select(item.id)}
                          className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition-all border ${
                            isActive
                              ? 'bg-white text-black font-semibold border-white shadow-md'
                              : 'bg-[#181822] hover:bg-[#252536] text-[#e2e2ec] hover:text-white border-[#242436] hover:border-[#3e3e58]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] font-mono ${isActive ? 'text-neutral-700' : 'text-[#818198]'}`}>{item.num}</span>
                              <span className={`text-xs ${isActive ? 'text-black font-semibold' : 'text-white'}`}>{item.label}</span>
                            </div>
                            <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-neutral-600' : 'text-[#9ca3af]'}`}>{item.desc}</p>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0 ml-2">
                            {item.badge && (
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                                isActive ? 'border-black/30 bg-[#f0f0f0] text-black font-bold' : 'border-[#38384e] bg-[#222232] text-[#c4c4dc]'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                            {isActive && <Check className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
