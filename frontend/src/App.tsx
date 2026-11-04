import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { TransactionStream } from './components/TransactionStream';
import { SyndicateGraph } from './components/SyndicateGraph';
import { MerchantDirectory } from './components/MerchantDirectory';
import { AIForensicInspector } from './components/AIForensicInspector';
import { ApiDocsConfig } from './components/ApiDocsConfig';
import { Merchant, Transaction, SyndicateGraph as SyndicateGraphType, AIInvestigationReport, RiskTier } from './types';
import { ArrowUp, Flame, Sparkles, RotateCcw, X, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [syndicateGraph, setSyndicateGraph] = useState<SyndicateGraphType | null>(null);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
  const [aiReport, setAiReport] = useState<AIInvestigationReport | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [simulationToast, setSimulationToast] = useState<{
    scenario: 'IPL_BETTING_BURST' | 'FESTIVE_BAKERY_RUSH' | 'MULE_RING_SMURF' | 'RESET';
    title: string;
    description: string;
    badge: string;
    type: 'danger' | 'success' | 'warning' | 'info';
  } | null>(null);

  useEffect(() => {
    if (!simulationToast) return;
    const timer = setTimeout(() => {
      setSimulationToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [simulationToast]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigateTab = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Initial data fetch
  const fetchData = async () => {
    try {
      const [mRes, tRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/api/merchants`),
        fetch(`${API_BASE}/api/transactions`),
        fetch(`${API_BASE}/api/syndicate/graph`)
      ]);

      let anySuccess = false;

      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.data) {
          const liveMerchants: Merchant[] = mData.data;
          setMerchants(liveMerchants);
          setSelectedMerchantId(prev => prev || liveMerchants[0]?.id || '');
          anySuccess = true;
        }
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData.data) {
          setTransactions(tData.data);
          anySuccess = true;
        }
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.data) {
          setSyndicateGraph(sData.data);
          anySuccess = true;
        }
      }

      setBackendConnected(anySuccess);
    } catch (e) {
      console.warn('Backend not responding to live fetch, using mock state:', e);
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Handle Scenario Simulation with Full Local & Backend Dual Reactivity
  const handleSimulate = async (scenario: 'IPL_BETTING_BURST' | 'FESTIVE_BAKERY_RUSH' | 'MULE_RING_SMURF' | 'RESET') => {
    setIsSimulating(true);
    const now = new Date();
    const bettingShop = merchants.find(m => m.id === 'MERC-BAKE-001');
    const bakeryShop = merchants.find(m => m.id === 'MERC-BAKE-002');
    const bettingShopName = bettingShop?.name ?? 'the flagged bakery';
    const bakeryShopName = bakeryShop?.name ?? 'the safe bakery';
    const bakeryCity = bakeryShop?.city ?? 'Bengaluru';
    const bakeryState = bakeryShop?.state ?? 'Karnataka';

    if (scenario === 'IPL_BETTING_BURST') {
      const bettingStakes = [1000, 2500, 5000, 10000, 15000, 20000];
      const cities = [
        { city: 'New Delhi', state: 'Delhi' },
        { city: 'Mumbai', state: 'Maharashtra' },
        { city: 'Jaipur', state: 'Rajasthan' },
        { city: 'Chandigarh', state: 'Punjab' },
        { city: 'Bengaluru', state: 'Karnataka' },
        { city: 'Kolkata', state: 'West Bengal' },
        { city: 'Hyderabad', state: 'Telangana' },
        { city: 'Ahmedabad', state: 'Gujarat' }
      ];

      const newTxns: Transaction[] = cities.map((place, i) => ({
        id: `TXN-IPL-${Date.now()}-${i}`,
        merchantId: 'MERC-BAKE-001',
        merchantName: bettingShopName,
        amount: bettingStakes[i % bettingStakes.length],
        currency: 'INR',
        paymentMethod: 'UPI',
        payerId: `USR-BET-${Math.floor(10000 + Math.random() * 90000)} (${place.city})`,
        payerState: place.state,
        payerCity: place.city,
        timestamp: new Date(now.getTime() - i * 12000).toISOString(),
        isRoundAmount: true,
        isNightTime: true,
        isMatchWindow: true,
        riskScore: Math.floor(92 + Math.random() * 7),
        anomalyFlags: [
          'MATCH_OVER_BURST',
          'OUT_OF_STATE_PAYER',
          'ROUND_AMOUNT_STAKE',
          'SUSPECTED_BET_DEPOSIT'
        ]
      }));

      setTransactions(prev => [...newTxns, ...prev]);
      setMerchants(prev => prev.map(m => m.id === 'MERC-BAKE-001' ? {
        ...m,
        driftScore: 96,
        currentTier: 'TIER_3_QUARANTINE',
        status: 'UNDER_REVIEW',
        metrics: {
          ...m.metrics,
          nightTimeRatio: 0.76,
          roundAmountRatio: 0.94,
          matchHourSpikeRatio: 0.88,
          totalVolume30d: m.metrics.totalVolume30d + newTxns.reduce((sum, t) => sum + t.amount, 0)
        },
        interventions: {
          ...m.interventions,
          rollingReservePercent: 50,
          maxTransactionLimit: 500,
          strFiled: true
        }
      } : m));

      setSimulationToast({
        scenario: 'IPL_BETTING_BURST',
        title: 'Cricket Match Bets Injected',
        description: `Sent 8 late-night betting payments (₹1,000–₹20,000) to ${bettingShopName}. Risk score jumped to 96% and payouts were automatically blocked.`,
        badge: 'Suspicious Activity Detected',
        type: 'danger'
      });
    } else if (scenario === 'FESTIVE_BAKERY_RUSH') {
      const retailPrices = [240, 399, 485, 750, 1150, 1380];
      const newTxns: Transaction[] = retailPrices.map((price, i) => ({
        id: `TXN-CAKE-${Date.now()}-${i}`,
        merchantId: 'MERC-BAKE-002',
        merchantName: bakeryShopName,
        amount: price,
        currency: 'INR',
        paymentMethod: i % 2 === 0 ? 'UPI' : 'CREDIT_CARD',
        payerId: `USR-LOC-${Math.floor(1000 + Math.random() * 9000)} (${bakeryCity})`,
        payerState: bakeryState,
        payerCity: bakeryCity,
        timestamp: new Date(now.getTime() - i * 25000).toISOString(),
        isRoundAmount: false,
        isNightTime: false,
        isMatchWindow: false,
        riskScore: Math.floor(5 + Math.random() * 8),
        anomalyFlags: []
      }));

      setTransactions(prev => [...newTxns, ...prev]);
      setMerchants(prev => prev.map(m => m.id === 'MERC-BAKE-002' ? {
        ...m,
        driftScore: 16,
        currentTier: 'TIER_0_SAFE',
        status: 'ACTIVE',
        metrics: {
          ...m.metrics,
          totalVolume30d: m.metrics.totalVolume30d + newTxns.reduce((sum, t) => sum + t.amount, 0),
          repeatPayerRatio: 0.42
        }
      } : m));

      setSimulationToast({
        scenario: 'FESTIVE_BAKERY_RUSH',
        title: 'Mother’s Day Cake Rush Injected',
        description: `Sent 6 normal daytime cake orders (₹240–₹1,380) to ${bakeryShopName}. The system verified these are real local orders in ${bakeryCity}, so payouts remain 100% instant with zero delays.`,
        badge: 'Honest Shop Protected',
        type: 'success'
      });
    } else if (scenario === 'RESET') {
      await fetchData();
      setSimulationToast({
        scenario: 'RESET',
        title: 'Test Data Reset',
        description: 'All shops and payment records have been restored to the clean OpenStreetMap baseline.',
        badge: 'Reset Complete',
        type: 'info'
      });
    }

    try {
      const res = await fetch(`${API_BASE}/api/simulator/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.info('Backend call skipped, local scenario simulation running seamlessly:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Handle Gemini AI Investigation
  const handleRunInvestigation = async (merchantId: string) => {
    setIsLoadingAi(true);
    setSelectedMerchantId(merchantId);
    try {
      const res = await fetch(`${API_BASE}/api/ai/investigate/${merchantId}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setAiReport(data.data);
      }
    } catch (e) {
      console.warn('AI Investigation call failed, using heuristic fallback:', e);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Quick helper to select merchant and jump to AI tab
  const handleSelectMerchantForAI = (merchantId: string) => {
    setSelectedMerchantId(merchantId);
    handleNavigateTab('ai-investigator');
    handleRunInvestigation(merchantId);
  };

  // Handle Merchant Tier / Intervention Updates
  const handleUpdateMerchantTier = async (merchantId: string, updates: Partial<Merchant['interventions']> & { tier?: RiskTier }) => {
    try {
      await fetch(`${API_BASE}/api/merchants/${merchantId}/tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      await fetchData();
    } catch (e) {
      console.warn('Update failed:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-[#EDEDED] flex flex-col font-sans selection:bg-white selection:text-black bg-baunfire-grid">
      
      {/* Minimalist Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
      />

      {/* Main Content Area with Smooth Page Transition */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div key={activeTab} className="animate-page-enter">
          {activeTab === 'overview' && (
            <DashboardOverview
              merchants={merchants}
              transactions={transactions}
              onSelectTab={handleNavigateTab}
              onSelectMerchantForAI={handleSelectMerchantForAI}
            />
          )}

          {activeTab === 'stream' && (
            <TransactionStream
              transactions={transactions}
              onSimulate={handleSimulate}
              isSimulating={isSimulating}
            />
          )}

          {activeTab === 'syndicate' && (
            <SyndicateGraph
              graphData={syndicateGraph}
              merchants={merchants}
              onSelectMerchantForAI={handleSelectMerchantForAI}
            />
          )}

          {activeTab === 'merchants' && (
            <MerchantDirectory
              merchants={merchants}
              onUpdateMerchantTier={handleUpdateMerchantTier}
              onSelectMerchantForAI={handleSelectMerchantForAI}
            />
          )}

          {activeTab === 'ai-investigator' && (
            <AIForensicInspector
              merchants={merchants}
              selectedMerchantId={selectedMerchantId}
              onSelectMerchant={setSelectedMerchantId}
              report={aiReport}
              isLoading={isLoadingAi}
              onRunInvestigation={handleRunInvestigation}
            />
          )}

          {activeTab === 'api-config' && <ApiDocsConfig />}
        </div>
      </main>

      {/* Interactive Scenario Simulation Toast Banner */}
      {simulationToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl animate-dropdown-enter">
          <div className={`p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl flex items-start justify-between gap-4 ${
            simulationToast.type === 'danger'
              ? 'bg-[#140A0D]/95 border-rose-500/40 shadow-rose-950/60 ring-1 ring-rose-500/20'
              : simulationToast.type === 'success'
                ? 'bg-[#0A140F]/95 border-emerald-500/40 shadow-emerald-950/60 ring-1 ring-emerald-500/20'
                : 'bg-[#0D0D11]/95 border-white/20 shadow-black/80 ring-1 ring-white/10'
          }`}>
            <div className="flex items-start gap-3.5 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                simulationToast.type === 'danger'
                  ? 'bg-rose-500/20 text-rose-400'
                  : simulationToast.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/10 text-white'
              }`}>
                {simulationToast.type === 'danger' ? (
                  <Flame className="w-5 h-5 animate-pulse" />
                ) : simulationToast.type === 'success' ? (
                  <Sparkles className="w-5 h-5 animate-bounce" />
                ) : (
                  <RotateCcw className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-mono tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full border ${
                    simulationToast.type === 'danger'
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      : simulationToast.type === 'success'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/20 bg-white/5 text-neutral-300'
                  }`}>
                    {simulationToast.badge}
                  </span>
                  <span className="text-xs font-bold text-white font-sans truncate">
                    {simulationToast.title}
                  </span>
                </div>

                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                  {simulationToast.description}
                </p>

                {simulationToast.scenario !== 'RESET' && (
                  <button
                    onClick={() => {
                      handleNavigateTab('stream');
                      setSimulationToast(null);
                    }}
                    className="mt-2 text-xs font-mono font-medium text-white hover:text-emerald-400 flex items-center gap-1.5 underline underline-offset-4 transition-colors"
                  >
                    <span>View Injected Transactions in Live Stream</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setSimulationToast(null)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Smooth Scroll Back-To-Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-white text-black shadow-2xl hover:bg-neutral-200 transition-all duration-300 hover:scale-110 active:scale-95 animate-fade-in group border border-white/20"
          title="Smooth scroll to top"
          aria-label="Smooth scroll to top"
        >
          <ArrowUp className="w-4 h-4 text-black group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* Baunfire Minimalist Editorial Footer */}
      <footer className="border-t border-white/[0.08] bg-[#050506] py-8 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-3 text-center sm:text-left">
            <span className="font-bold text-white tracking-tight font-sans">AEGISPAY SENTINEL</span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="font-mono text-[11px] text-neutral-400">
              Follow The Money Innovation Challenge (IIM Bangalore &times; PayU)
            </span>
          </div>

          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span className="text-emerald-400">8 Categories &middot; 18 OSM Shops &middot; Synthetic Risk Layer</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
