import React, { useState } from 'react';
import { 
  Network, 
  Info, 
  ShieldAlert, 
  Share2, 
  Layers, 
  ExternalLink,
  Lock,
  Radio,
  ArrowRight
} from 'lucide-react';
import { SyndicateGraph as SyndicateGraphType, SyndicateNode, Merchant } from '../types';
import { getMerchantImage, SYNTHETIC_RISK_BADGE } from '../merchantVisuals';

interface SyndicateGraphProps {
  graphData: SyndicateGraphType | null;
  merchants: Merchant[];
  onSelectMerchantForAI: (merchantId: string) => void;
}

export const SyndicateGraph: React.FC<SyndicateGraphProps> = ({
  graphData,
  merchants,
  onSelectMerchantForAI
}) => {
  const [selectedNode, setSelectedNode] = useState<SyndicateNode | null>(null);

  if (!graphData) {
    return (
      <div className="bf-card rounded-2xl p-12 text-center text-neutral-400 font-mono text-xs">
        Loading network topology map...
      </div>
    );
  }

  const nodePositions: Record<string, { x: number; y: number }> = {
    'HUB-BET-SYNDICATE': { x: 450, y: 70 },
    'MERC-BAKE-001': { x: 300, y: 220 },
    'MERC-REST-006': { x: 450, y: 220 },
    'MERC-CONV-018': { x: 600, y: 220 },
    'INFRA-VPN-SUBNET': { x: 160, y: 150 },
    'CLUSTER-PAYERS-NORTH': { x: 220, y: 370 },
    'CLUSTER-PAYERS-WEST': { x: 530, y: 370 },
    'MERC-BAKE-002': { x: 770, y: 220 }
  };

  const showcaseMerchants = [
    { id: 'MERC-BAKE-001', label: 'DEMO FRONT #1 • BAKERY', tone: 'rose' as const },
    { id: 'MERC-REST-006', label: 'DEMO FRONT #2 • RESTAURANT', tone: 'amber' as const },
    { id: 'MERC-CONV-018', label: 'DEMO FRONT #3 • CONVENIENCE', tone: 'amber' as const }
  ]
    .map(entry => ({ ...entry, merchant: merchants.find(m => m.id === entry.id) }))
    .filter((entry): entry is typeof entry & { merchant: Merchant } => Boolean(entry.merchant));

  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* Editorial Header */}
      <section className="relative pt-6 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center space-x-2">
              <span className="bf-kicker text-neutral-400">[ 03 / CONNECTED SHOPS MAP ]</span>
              <span className="text-white/20">&bull;</span>
              <span className="text-xs font-mono text-rose-400">NETWORK LINK CHECKER</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] font-sans">
              Betting Network &amp; Connected Shops.
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-2xl pt-2">
              Online betting operators try to avoid gateway limits by spreading bets across multiple shops in unrelated categories (bakeries, restaurants, convenience stores). 
              This interactive map connects the dots using shared internet devices and matching late-night betting times. Node risk scores are synthetic demo data.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono shrink-0">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Flagged Demo Profile
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Safe Shop (Demo Profile)
            </span>
          </div>
        </div>
      </section>

      {/* Main Canvas & Inspector Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Interactive Canvas */}
        <div className="bf-card rounded-2xl p-4 lg:col-span-2 relative overflow-hidden min-h-[500px] flex items-center justify-center bg-[#07070A]">
          <svg className="w-full h-[470px]" viewBox="0 0 900 450">
            <defs>
              <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#be123c" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0.9" />
              </linearGradient>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#33333d" />
              </marker>
              <marker
                id="arrow-rose"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
              </marker>
            </defs>

            {/* Links / Edges */}
            {graphData.links.map((link, idx) => {
              const src = nodePositions[link.source];
              const tgt = nodePositions[link.target];
              if (!src || !tgt) return null;

              const isSuspicious = link.relationship === 'FUNDS_ROUTED' || link.relationship === 'SHARED_DEVICE';

              return (
                <g key={idx}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isSuspicious ? '#f43f5e' : '#26262e'}
                    strokeWidth={isSuspicious ? '2' : '1.5'}
                    strokeDasharray={link.relationship === 'SHARED_DEVICE' ? '4,4' : undefined}
                    strokeOpacity={0.7}
                    markerEnd={isSuspicious ? 'url(#arrow-rose)' : 'url(#arrow)'}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {graphData.nodes.map(node => {
              const pos = nodePositions[node.id] || { x: 450, y: 220 };
              const isSelected = selectedNode?.id === node.id;
              const isAggregator = node.type === 'SYNDICATE_AGGREGATOR';
              const isMule = node.riskScore >= 70;
              const isSafe = node.riskScore < 30;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer transition-transform duration-300 hover:scale-115"
                  onClick={() => setSelectedNode(node)}
                >
                  {/* Ping animation for flagged nodes */}
                  {isMule && (
                    <circle
                      r="26"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      strokeOpacity="0.4"
                      className="animate-ping"
                      style={{ animationDuration: '3s' }}
                    />
                  )}

                  <circle
                    r={isAggregator ? 24 : 18}
                    fill={
                      isAggregator
                        ? 'url(#roseGrad)'
                        : isSafe
                        ? 'url(#emeraldGrad)'
                        : isMule
                        ? 'url(#roseGrad)'
                        : 'url(#amberGrad)'
                    }
                    stroke={isSelected ? '#ffffff' : '#0B0B0E'}
                    strokeWidth={isSelected ? '3' : '2'}
                  />

                  <text
                    textAnchor="middle"
                    dy=".3em"
                    fill="#ffffff"
                    fontSize={isAggregator ? '11px' : '9px'}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {isAggregator ? 'HUB' : node.type === 'PAYER_CLUSTER' ? 'RING' : node.type === 'IP_SUBNET' ? 'VPN' : 'MCC'}
                  </text>

                  <text
                    y={isAggregator ? 34 : 28}
                    textAnchor="middle"
                    fill="#ededed"
                    fontSize="10px"
                    fontWeight="500"
                    fontFamily="sans-serif"
                    className="select-none"
                  >
                    {node.name.length > 22 ? node.name.substring(0, 20) + '...' : node.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Hint */}
          <div className="absolute bottom-4 left-4 text-[11px] font-mono text-neutral-400 bg-neutral-900/90 px-3 py-1.5 rounded-full border border-white/[0.08] flex items-center gap-2">
            <Info className="w-3.5 h-3.5" />
            <span>Click any node to see links, risk scores, and shared devices</span>
          </div>
        </div>

        {/* Entity Inspector Panel */}
        <div className="bf-card rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="bf-kicker">[ DETAILS PANEL ]</span>
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                    {selectedNode.type}
                  </span>
                  <h4 className="text-xl font-bold text-white mt-1 tracking-tight">
                    {selectedNode.name}
                  </h4>
                  <p className="text-xs font-mono text-neutral-400 mt-1">{selectedNode.category}</p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.08]">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">
                    Demo Risk Assessment:
                  </span>
                  <div className="flex items-center space-x-3">
                    <span className={`text-3xl font-bold font-mono ${
                      selectedNode.riskScore >= 70 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {selectedNode.riskScore}/100
                    </span>
                    <span className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-full ${
                      selectedNode.riskScore >= 70 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {selectedNode.riskScore >= 70 ? 'Flagged Demo Profile' : 'Safe Shop (Demo Profile)'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Behavior Summary:
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-4 rounded-xl border border-white/[0.06]">
                    {selectedNode.details}
                  </p>
                </div>

                {selectedNode.type === 'MERCHANT' && (
                  <button
                    onClick={() => onSelectMerchantForAI(selectedNode.id)}
                    className="w-full bf-pill-btn bf-pill-btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Run Gemini AI Investigation</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-neutral-500 text-xs space-y-3">
                <Radio className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
                <p>Click on any node on the map to see its connections, money flow, and shared devices.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/[0.08] text-[11px] text-neutral-400 space-y-1">
            <span className="font-semibold text-neutral-300 block font-mono uppercase text-[10px]">
              How Demo Mule Networks Work:
            </span>
            <p className="leading-relaxed">
              In this synthetic scenario, betting organizers spread bets across unrelated real shops (a bakery, a restaurant, and a convenience store) so that no single merchant crosses the gateway&apos;s alert limit.
            </p>
          </div>
        </div>

      </section>

      {/* Visual Showcase: Demo fronts from the synthetic ring */}
      <section className="space-y-4">
        <div>
          <span className="bf-kicker">[ 04 / CONNECTED DEMO PROFILES ]</span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
            Real Shops Cast as Cover Businesses
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            These are real OpenStreetMap businesses in Bengaluru. Their inclusion in this betting-ring narrative is a synthetic demo scenario &mdash; no fraud is alleged against the actual merchants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {showcaseMerchants.map(({ merchant, label, tone }) => (
            <div 
              key={merchant.id}
              onClick={() => onSelectMerchantForAI(merchant.id)}
              className="bf-media-card group cursor-pointer flex flex-col justify-between"
            >
              <div className="relative h-44 w-full overflow-hidden">
                <img 
                  src={getMerchantImage(merchant)} 
                  alt={merchant.name}
                  className="w-full h-full object-cover brightness-[0.7] group-hover:brightness-[0.85]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/40 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    tone === 'rose'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {label}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-mono font-bold text-neutral-200 bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
                    OSM {merchant.osmRef || merchant.osmId}
                  </span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                    {merchant.name}
                  </h4>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    {merchant.city}, {merchant.state} &bull; ₹{(merchant.metrics.totalVolume30d / 100000).toFixed(1)}L/month
                  </p>
                  <p className="text-xs text-neutral-300 mt-2 line-clamp-2">
                    {merchant.riskFactors[0] || SYNTHETIC_RISK_BADGE}
                  </p>
                </div>
                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-neutral-400">
                  <span className={tone === 'rose' ? 'text-rose-400' : 'text-amber-400'}>
                    Demo risk: {merchant.driftScore}/100
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Inspect <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
