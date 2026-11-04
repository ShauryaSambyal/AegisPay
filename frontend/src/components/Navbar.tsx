import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  ChevronDown, 
  Check
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Consolidated navigation dropdown items in plain English
  const navItems = [
    { 
      id: 'overview', 
      num: '01', 
      label: 'Overview', 
      desc: 'Live shop monitor, stats & caught betting money',
      badge: null
    },
    { 
      id: 'stream', 
      num: '02', 
      label: 'Live Payments Stream', 
      desc: 'Real-time payment feed and test tools',
      badge: 'LIVE'
    },
    { 
      id: 'syndicate', 
      num: '03', 
      label: 'Betting Network Map', 
      desc: 'Map of synthetic betting rings across real shops',
      badge: null
    },
    { 
      id: 'merchants', 
      num: '04', 
      label: 'Shops & Controls', 
      desc: 'Shop directory, safety levels and payout limits',
      badge: null
    },
    { 
      id: 'ai-investigator', 
      num: '05', 
      label: 'AI Investigation', 
      desc: 'Official bank reports powered by Google Gemini',
      badge: 'AI'
    },
    { 
      id: 'api-config', 
      num: '06', 
      label: 'API & Settings', 
      desc: 'Data sources, keys and .env setup guide',
      badge: null
    }
  ];

  const currentItem = navItems.find(item => item.id === activeTab) || navItems[0];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070708]/92 backdrop-blur-xl border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          
          {/* Left: Brand Identity & Dropdown Navigator */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Brand Logo & Name */}
            <div 
              className="flex items-center space-x-2.5 cursor-pointer group" 
              onClick={() => {
                setActiveTab('overview');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title="Return to Overview"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center text-black shadow-md transition-transform duration-300 group-hover:scale-105 shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.5]" />
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white font-sans">
                  AEGISPAY
                </span>
                <span className="text-[9px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded-full border border-white/20 text-neutral-300">
                  SHOP GUARD
                </span>
              </div>
            </div>

            {/* Subtle Divider */}
            <div className="hidden sm:block h-6 w-px bg-white/10" />

            {/* Consolidated Navigation Dropdown Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-mono transition-all duration-200 border ${
                  isDropdownOpen
                    ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/15 hover:border-white/30'
                }`}
                aria-expanded={isDropdownOpen}
                aria-label="Toggle navigation views"
              >
                <div className="flex items-center gap-1.5 text-left">
                  <span className={`text-[10px] hidden md:inline font-mono ${isDropdownOpen ? 'text-neutral-700' : 'text-neutral-400'}`}>
                    {currentItem.num} /
                  </span>
                  <span className="font-semibold tracking-tight truncate max-w-[120px] sm:max-w-[160px] md:max-w-none">
                    {currentItem.label}
                  </span>
                </div>

                <ChevronDown 
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ml-0.5 ${
                    isDropdownOpen ? 'rotate-180 text-black' : 'text-neutral-400'
                  }`} 
                />
              </button>

              {/* Dropdown Menu Popover */}
              {isDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 sm:w-[22rem] rounded-2xl bg-[#09090C]/95 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/90 p-2 z-50 animate-dropdown-enter ring-1 ring-white/10">
                  
                  {/* Header bar */}
                  <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                      NAVIGATION &bull; {navItems.length} VIEWS
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ACTIVE
                    </span>
                  </div>

                  {/* Module List */}
                  <div className="py-1.5 space-y-1">
                    {navItems.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition-all duration-200 group ${
                            isActive 
                              ? 'bg-white text-black font-semibold shadow-md' 
                              : 'hover:bg-white/[0.07] text-neutral-300 hover:text-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] font-mono ${isActive ? 'text-neutral-700' : 'text-neutral-500'}`}>
                                {item.num}
                              </span>
                              <span className={`text-xs tracking-tight ${isActive ? 'text-black font-semibold' : 'text-white'}`}>
                                {item.label}
                              </span>
                            </div>
                            <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-neutral-600' : 'text-neutral-400'}`}>
                              {item.desc}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 shrink-0 ml-2">
                            {item.badge && (
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                                isActive 
                                  ? 'border-black/20 bg-black/10 text-black font-semibold' 
                                  : 'border-white/20 bg-white/5 text-neutral-300'
                              }`}>
                                {item.badge}
                              </span>
                            )}
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
          </div>

        </div>
      </div>
    </header>
  );
};
