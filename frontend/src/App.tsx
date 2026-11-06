import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { MotionBlurCanvas, MotionBlurCanvasHandle } from './components/MotionBlurCanvas';
import { DashboardOverview } from './components/DashboardOverview';
import { TransactionStream } from './components/TransactionStream';
import { SyndicateGraph } from './components/SyndicateGraph';
import { MerchantDirectory } from './components/MerchantDirectory';
import { AIForensicInspector } from './components/AIForensicInspector';
import { ApiDocsConfig } from './components/ApiDocsConfig';
import { MLInsights } from './components/MLInsights';
import { SimulationToast, ToastState } from './components/SimulationToast';
import { AuthModal } from './components/AuthModal';
import {
  fetchCurrentUser,
  fetchModelInfo,
  fetchRealMerchants,
  fetchSimulatedMerchants,
  fetchSyndicateGraph,
  fetchTransactions,
  investigateMerchant,
  logoutUser,
  runScenario,
  ScenarioName,
  updateMerchantInterventions,
} from './api';
import {
  AIInvestigationReport,
  AuthUser,
  MlModelInfo,
  RealMerchant,
  RiskTier,
  SimulatedMerchant,
  SyndicateGraphType,
  Transaction,
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [realMerchants, setRealMerchants] = useState<RealMerchant[]>([]);
  const [simulatedMerchants, setSimulatedMerchants] = useState<SimulatedMerchant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [syndicateGraph, setSyndicateGraph] = useState<SyndicateGraphType | null>(null);
  const [modelInfo, setModelInfo] = useState<MlModelInfo | null>(null);
  const [mlOnline, setMlOnline] = useState<boolean>(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
  const [aiReport, setAiReport] = useState<AIInvestigationReport | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const motionBlurRef = useRef<MotionBlurCanvasHandle>(null);

  // User & Provider Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'provider'>('login');

  // Restore authenticated session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('aegispay_id_token');
    if (!savedToken) return;

    setIdToken(savedToken);
    fetchCurrentUser(savedToken)
      .then(res => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
        } else {
          localStorage.removeItem('aegispay_id_token');
          setIdToken(null);
          setCurrentUser(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('aegispay_id_token');
        setIdToken(null);
        setCurrentUser(null);
      });
  }, []);

  const handleAuthSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    setIdToken(token);
    localStorage.setItem('aegispay_id_token', token);
    setToast({
      scenario: 'RESET',
      title: 'Authentication Success',
      description: `Welcome ${user.displayName || user.email}!`,
      badge: 'Auth',
      type: 'success',
    });
  };

  const handleLogout = async () => {
    try {
      if (idToken) await logoutUser(idToken);
    } catch {
      // Ignore logout transport errors
    } finally {
      localStorage.removeItem('aegispay_id_token');
      setCurrentUser(null);
      setIdToken(null);
      setToast({
        scenario: 'RESET',
        title: 'Signed Out',
        description: 'You have been signed out of AegisPay.',
        badge: 'Session',
        type: 'info',
      });
    }
  };

  const handleOpenAuth = (tab: 'login' | 'register' | 'provider' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchData = useCallback(async () => {
    try {
      const [real, simulated, txns, graph] = await Promise.all([
        fetchRealMerchants(),
        fetchSimulatedMerchants(),
        fetchTransactions(),
        fetchSyndicateGraph(),
      ]);
      setRealMerchants(real as RealMerchant[]);
      setSimulatedMerchants(simulated);
      setTransactions(txns);
      setSyndicateGraph(graph);
      setSelectedMerchantId(prev => prev || simulated[0]?.id || '');
      setBackendConnected(true);
    } catch (error) {
      console.warn('Backend unavailable:', error);
      setBackendConnected(false);
    }

    try {
      const info = await fetchModelInfo();
      setModelInfo(info);
      setMlOnline(true);
    } catch {
      setModelInfo(null);
      setMlOnline(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const navigate = (tab: string) => {
    if (tab !== activeTab) {
      motionBlurRef.current?.triggerBlur('forward');
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSimulate = async (scenario: ScenarioName) => {
    setIsSimulating(true);
    try {
      const message = await runScenario(scenario);
      await fetchData();
      setToast({
        scenario,
        title:
          scenario === 'RESET'
            ? 'Simulation reset'
            : scenario === 'FESTIVE_BAKERY_RUSH'
              ? 'Honest-control payments injected'
              : scenario === 'IPL_BETTING_BURST'
                ? 'Match-window payments injected'
                : 'Cross-merchant deposits injected',
        description: message,
        badge: scenario === 'RESET' ? 'Reset' : 'Simulated data',
        type: scenario === 'FESTIVE_BAKERY_RUSH' ? 'success' : scenario === 'RESET' ? 'info' : 'danger',
      });
    } catch (error) {
      setToast({
        scenario,
        title: 'Simulation failed',
        description: error instanceof Error ? error.message : String(error),
        badge: 'Error',
        type: 'info',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRunInvestigation = async (merchantId: string) => {
    setIsLoadingAi(true);
    setSelectedMerchantId(merchantId);
    try {
      setAiReport(await investigateMerchant(merchantId));
    } catch (error) {
      setAiReport(null);
      setToast({
        scenario: 'RESET',
        title: 'Investigation unavailable',
        description: error instanceof Error ? error.message : String(error),
        badge: 'Error',
        type: 'info',
      });
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleSelectMerchantForAI = (merchantId: string) => {
    navigate('ai-investigator');
    handleRunInvestigation(merchantId);
  };

  const handleUpdateMerchantTier = async (
    merchantId: string,
    updates: Partial<SimulatedMerchant['interventions']> & { tier?: RiskTier }
  ) => {
    try {
      await updateMerchantInterventions(merchantId, updates);
      await fetchData();
    } catch (error) {
      console.warn('Intervention update failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-[#EDEDED] flex flex-col font-sans selection:bg-white selection:text-black bg-baunfire-grid relative">
      <MotionBlurCanvas ref={motionBlurRef} />
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigate}
        backendConnected={backendConnected}
        mlOnline={mlOnline}
        onTabSelectBlur={navigate}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14, scale: 0.985, filter: 'blur(16px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -14, scale: 1.015, filter: 'blur(16px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {activeTab === 'overview' && (
              <DashboardOverview
                realMerchants={realMerchants}
                simulatedMerchants={simulatedMerchants}
                transactions={transactions}
                modelInfo={modelInfo}
                mlOnline={mlOnline}
                onSelectTab={navigate}
                onSelectMerchantForAI={handleSelectMerchantForAI}
              />
            )}

            {activeTab === 'stream' && (
              <TransactionStream
                transactions={transactions}
                simulatedMerchants={simulatedMerchants}
                onSimulate={handleSimulate}
                isSimulating={isSimulating}
              />
            )}

            {activeTab === 'syndicate' && (
              <SyndicateGraph
                graphData={syndicateGraph}
                simulatedMerchants={simulatedMerchants}
                onSelectMerchantForAI={handleSelectMerchantForAI}
              />
            )}

            {activeTab === 'merchants' && (
              <MerchantDirectory
                realMerchants={realMerchants}
                simulatedMerchants={simulatedMerchants}
                onUpdateMerchantTier={handleUpdateMerchantTier}
                onSelectMerchantForAI={handleSelectMerchantForAI}
              />
            )}

            {activeTab === 'ml-insights' && (
              <MLInsights
                simulatedMerchants={simulatedMerchants}
                realMerchants={realMerchants}
                modelInfo={modelInfo}
                mlOnline={mlOnline}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'ai-investigator' && (
              <AIForensicInspector
                simulatedMerchants={simulatedMerchants}
                selectedMerchantId={selectedMerchantId}
                onSelectMerchant={setSelectedMerchantId}
                report={aiReport}
                isLoading={isLoadingAi}
                onRunInvestigation={handleRunInvestigation}
              />
            )}

            {activeTab === 'api-config' && <ApiDocsConfig />}
          </motion.div>
        </AnimatePresence>
      </main>

      <SimulationToast toast={toast} onDismiss={() => setToast(null)} onViewStream={() => navigate('stream')} />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        idToken={idToken}
        onAuthSuccess={handleAuthSuccess}
        initialTab={authModalTab}
      />
    </div>
  );
};

export default App;
