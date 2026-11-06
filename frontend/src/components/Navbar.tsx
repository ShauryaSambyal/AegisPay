import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, ShieldCheck, User, Building2, LogOut, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthUser } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  backendConnected: boolean;
  mlOnline: boolean;
  onTabSelectBlur?: (tabId: string) => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: (tab?: 'login' | 'register' | 'provider') => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  backendConnected: _backendConnected,
  onTabSelectBlur,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setUserMenuOpen(false);
      }
    };
    if (isOpen || userMenuOpen) {
      document.addEventListener('mousedown', onClick);
      document.addEventListener('keydown', onKey);
    }
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, userMenuOpen]);

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
    if (onTabSelectBlur) {
      onTabSelectBlur(tabId);
    } else {
      setActiveTab(tabId);
    }
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

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.95, y: -6, filter: 'blur(8px)' }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 mt-2 w-72 sm:w-[23rem] rounded-2xl bg-[#121218]/95 backdrop-blur-xl border border-[#2e2e42] shadow-2xl p-2.5 z-50 ring-1 ring-[#3b3b54]"
                  >
                    <div className="space-y-1.5">
                      {navItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                          <motion.button
                            key={item.id}
                            whileHover={{ scale: 1.012, x: 2 }}
                            whileTap={{ scale: 0.98, filter: 'blur(1.5px)' }}
                            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                            onClick={() => select(item.id)}
                            className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition-colors border ${
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
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right side: Provider & Auth Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[#14141e] hover:bg-[#1c1c2b] border border-[#2e2e42] text-xs transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="font-medium text-white truncate max-w-[120px]">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </div>
                    <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                      <span className="uppercase text-[9px] font-mono text-emerald-400">
                        {currentUser.organizationMembership?.role || currentUser.role || 'Member'}
                      </span>
                      {currentUser.organizationMembership?.provider && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[90px] text-neutral-300">
                            {currentUser.organizationMembership.provider.organisationName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#121218] border border-[#2e2e42] shadow-2xl p-3 z-50 ring-1 ring-[#3b3b54]"
                    >
                      <div className="px-2 py-1.5 border-b border-[#222230] mb-2">
                        <p className="text-xs font-semibold text-white truncate">{currentUser.displayName || 'User'}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{currentUser.email}</p>
                      </div>

                      {/* Provider organization info */}
                      {currentUser.organizationMembership?.provider ? (
                        <div className="p-2 rounded-xl bg-[#191924] border border-[#2d2d3e] mb-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-neutral-400">ORGANISATION</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                currentUser.organizationMembership.provider.status === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {currentUser.organizationMembership.provider.status}
                            </span>
                          </div>
                          <div className="font-semibold text-white truncate">
                            {currentUser.organizationMembership.provider.organisationName}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onOpenAuth?.('provider');
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/20 mb-2 transition-colors"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          Register Payment Provider
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout?.();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuth?.('provider')}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Register Provider
                </button>
                <button
                  onClick={() => onOpenAuth?.('login')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold shadow-md transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-black" />
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
