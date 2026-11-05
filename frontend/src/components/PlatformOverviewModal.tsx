import React from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Croissant, 
  Activity, 
  Network, 
  Layers, 
  Bot, 
  Key, 
  Cpu,
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Flame,
  Globe,
  Coins,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface PlatformOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const PlatformOverviewModal: React.FC<PlatformOverviewModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-5xl my-auto bg-[#0A0A0C] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#070709] sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <span className="bf-kicker text-neutral-400">[ ARCHITECTURAL OVERVIEW &amp; GUIDE ]</span>
            <span className="text-white/20">&bull;</span>
            <span className="text-xs text-neutral-400 font-mono">AEGISPAY SENTINEL v2.4</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-all"
            aria-label="Close Overview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-12">
          
          {/* Hero Banner */}
          <div className="relative rounded-xl border border-white/[0.08] overflow-hidden bg-gradient-to-br from-neutral-900/60 to-black p-6 sm:p-8">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-neutral-300 mb-4">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>FOLLOW THE MONEY INNOVATION CHALLENGE &bull; IIM BANGALORE &times; PAYU</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-3">
                Autonomous Behavioral Sentinel for Payment Aggregators
              </h1>
              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                AegisPay Sentinel solves the payment industry&rsquo;s toughest fraud challenge:
                <strong className="text-white"> &ldquo;The Bakery That Takes Bets&rdquo;</strong>.
                It continuously analyzes operational drift across simulated merchants to illustrate how covert sports betting
                syndicates could be exposed. All risk data is synthetic and no detection accuracy is claimed: the model is
                evaluated on simulated data only, and real-world performance is <span className="text-amber-400 font-semibold font-mono">NOT VALIDATED</span>.
              </p>
            </div>
          </div>

          {/* Section 1: The Problem Statement */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="bf-kicker">[ 01 / THE CORE PROBLEM ]</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              The Trojan Horse: Why Traditional Gateway Rules Fail
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.06] space-y-2">
                <span className="text-neutral-400 font-mono uppercase tracking-wider block font-semibold text-[11px]">
                  1. Authentic Onboarding KYC
                </span>
                <p className="text-neutral-300 leading-relaxed">
                  Syndicates onboard legitimate businesses using 100% genuine PAN, GSTIN, FSSAI certificates, and shop leases. At day 1, zero red flags exist.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.06] space-y-2">
                <span className="text-neutral-400 font-mono uppercase tracking-wider block font-semibold text-[11px]">
                  2. Benign Individual Tickets
                </span>
                <p className="text-neutral-300 leading-relaxed">
                  Single UPI deposits of ₹1,000 or ₹2,500 appear indistinguishable from everyday retail purchases (e.g. customized birthday cakes or catering pre-orders).
                </p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.06] space-y-2">
                <span className="text-neutral-400 font-mono uppercase tracking-wider block font-semibold text-[11px]">
                  3. Severe Collateral Damage
                </span>
                <p className="text-neutral-300 leading-relaxed">
                  Crude rule engines freeze accounts whenever sales spike. Freezing an innocent bakery during Mother&rsquo;s Day destroys cash flow and causes merchant churn.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: The 5-Dimensional Drift Engine */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="bf-kicker">[ 02 / DETECTION ARCHITECTURE ]</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              The 5 Forensic Drift Signals That Unmask Fronts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-neutral-900/30 border border-white/[0.06] flex items-start space-x-3.5">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">1. Temporal &amp; Match Window Synchronization</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Correlates transaction timestamps with live sports events. 68% of betting front deposits arrive between 22:30 &amp; 02:00 during cricket death overs, whereas bakeries close by 21:30.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/30 border border-white/[0.06] flex items-start space-x-3.5">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                  <Globe className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">2. Geographic Entropy &amp; Spatial Dispersion</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Calculates Shannon Geographic Entropy. A local neighborhood bakery in Indore receiving payments from 28 Indian states without national delivery logistics is mathematically anomalous.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/30 border border-white/[0.06] flex items-start space-x-3.5">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">3. Benford Clustering &amp; Round Denominations</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Real retail bakeries have fractional change and GST figures (₹240, ₹485). Wagering syndicates cluster in identical round stakes (₹1,000, ₹2,500, ₹5,000, ₹10,000).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/30 border border-white/[0.06] flex items-start space-x-3.5">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                  <Activity className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">4. Payer Retention &amp; Graph Entropy</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    In the simulation model, legitimate retail stores retain 35%&ndash;50% repeat patrons, whereas simulated betting fronts exhibit ~95% disposable single-use wallets.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/30 border border-white/[0.06] md:col-span-2 flex items-start space-x-3.5">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">5. Multi-Modal Footprint &amp; Velocity Reconciliation</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Compares simulated transaction velocity (for example 3.1x the declared onboarding turnover) against the merchant's own adaptive baseline instead of a fixed global threshold.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: The Proportionate Tiered Response Matrix */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="bf-kicker">[ 03 / RESPONSE FRAMEWORK ]</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Proportionate Tiering: No More Blanket Freezing
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                <span className="text-emerald-400 font-mono font-bold">TIER 0: SAFE (0 - 25)</span>
                <h4 className="text-sm font-bold text-white">Instant Settlement</h4>
                <p className="text-neutral-400 leading-relaxed text-[11px]">
                  Seasonal surge dampener active. Zero friction for genuine sales surges (e.g., Old Madras Baking Company).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/20 space-y-2">
                <span className="text-sky-400 font-mono font-bold">TIER 1: MONITOR (26 - 55)</span>
                <h4 className="text-sm font-bold text-white">Soft Verification</h4>
                <p className="text-neutral-400 leading-relaxed text-[11px]">
                  Funds flow freely. Payer is prompted with itemized retail checkout confirmation (e.g., Daily Bread).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2">
                <span className="text-amber-400 font-mono font-bold">TIER 2: RESTRICT (56 - 80)</span>
                <h4 className="text-sm font-bold text-white">Rolling Reserve</h4>
                <p className="text-neutral-400 leading-relaxed text-[11px]">
                  20% reserve hold, out-of-state ticket cap, video POS audit dispatched (e.g., Nandhana).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                <span className="text-rose-400 font-mono font-bold">TIER 3: QUARANTINE (81 - 100)</span>
                <h4 className="text-sm font-bold text-white">STR &amp; Hold</h4>
                <p className="text-neutral-400 leading-relaxed text-[11px]">
                  Payouts held. Complete FIU-IND Suspicious Transaction Report drafted via Gemini (e.g., Thom&apos;s Bakery).
                </p>
              </div>
            </div>
            <p className="text-[11px] font-mono text-neutral-500">
              Shop names are real OpenStreetMap records. Every tier assignment, volume, and transaction shown here is synthetic demo data.
            </p>
          </div>

          {/* Section 4: Complete Interactive Features Tour */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="bf-kicker">[ 04 / INTERACTIVE PLATFORM MODULES ]</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              All Features Available in This Website
            </h2>
            <div className="space-y-3">
              {[
                {
                  tab: 'overview',
                  title: 'Executive Dashboard',
                  icon: Activity,
                  desc: 'High-level telemetry dashboard with live system metrics, active watchlist table, and false-positive immunity monitoring.',
                  action: 'Jump to Executive Dashboard'
                },
                {
                  tab: 'stream',
                  title: 'Live Telemetry Stream & Stress Simulator',
                  icon: Flame,
                  desc: 'Real-time transaction ingestion feed with sub-second drift scoring and interactive scenario injection buttons (IPL Match Spike, Festive Rush, Mule Smurfing).',
                  action: 'Open Live Stream'
                },
                {
                  tab: 'syndicate',
                  title: 'Mule Syndicate Graph',
                  icon: Network,
                  desc: 'Interactive SVG network topology illustrating how a synthetic betting syndicate smurfs funds across real bakery, restaurant, and convenience-store profiles to offshore endpoints.',
                  action: 'Explore Network Graph'
                },
                {
                  tab: 'merchants',
                  title: 'Merchant Directory & Tiered Controls',
                  icon: Layers,
                  desc: 'Full directory of all registered merchants with KYC verification records and real-time interactive sliders to adjust reserves, caps, and geofences.',
                  action: 'Manage Merchants'
                },
                {
                  tab: 'ai-investigator',
                  title: 'Gemini AI Forensic Dossier Generator',
                  icon: Bot,
                  desc: 'Generates a simulated investigation note with plain-English evidence, statutory references and next steps. It is a demo artefact: not a legal finding and not a regulatory filing.',
                  action: 'Launch AI Forensic Agent'
                },
                {
                  tab: 'ml-insights',
                  title: 'ML Betting Platform & Syndicate Predictor',
                  icon: Cpu,
                  desc: 'Calibrated machine learning model to evaluate behavioral drift and predict illegal betting platform infiltration for any business.',
                  action: 'Run ML Predictor'
                }
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.06] hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0 text-white">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-semibold text-white">{feat.title}</h4>
                          <span className="text-[10px] font-mono text-neutral-400">[{feat.tab}]</span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab(feat.tab);
                      }}
                      className="bf-pill-btn shrink-0 flex items-center space-x-1.5 self-start sm:self-auto"
                    >
                      <span>{feat.action}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#070709] flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="text-xs text-neutral-400 font-mono">
            Developed for IIM Bangalore &amp; PayU &bull; Problem Statement: &ldquo;The Bakery That Takes Bets&rdquo;
          </div>
          <button
            onClick={onClose}
            className="bf-pill-btn bf-pill-btn-primary"
          >
            Start Exploring Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
