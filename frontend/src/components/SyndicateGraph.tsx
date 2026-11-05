import React, { useMemo, useState } from 'react';
import { ExternalLink, FlaskConical, Info, Radio } from 'lucide-react';
import { SimulatedMerchant, SyndicateGraphType, SyndicateNode } from '../types';

interface SyndicateGraphProps {
  graphData: SyndicateGraphType | null;
  simulatedMerchants: SimulatedMerchant[];
  onSelectMerchantForAI: (merchantId: string) => void;
}

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 460;

/** Deterministic layout: infra left, payer clusters bottom, ring centre, hub top. */
const layout = (nodes: SyndicateNode[]): Record<string, { x: number; y: number }> => {
  const groups: Record<string, SyndicateNode[]> = { HUB: [], CLUSTER: [], INFRA: [], SIM: [] };
  nodes.forEach(node => {
    if (node.type === 'SYNDICATE_AGGREGATOR') groups.HUB.push(node);
    else if (node.type === 'PAYER_CLUSTER') groups.CLUSTER.push(node);
    else if (node.type === 'IP_SUBNET') groups.INFRA.push(node);
    else groups.SIM.push(node);
  });

  const positions: Record<string, { x: number; y: number }> = {};
  groups.HUB.forEach((node, index) => {
    positions[node.id] = { x: VIEW_WIDTH / 2 + index * 70, y: 60 };
  });
  groups.INFRA.forEach((node, index) => {
    positions[node.id] = { x: 120, y: 150 + index * 90 };
  });
  groups.CLUSTER.forEach((node, index) => {
    positions[node.id] = { x: 260 + index * 320, y: 390 };
  });
  const merchants = groups.SIM;
  merchants.forEach((node, index) => {
    const width = 520;
    const step = merchants.length > 1 ? width / (merchants.length - 1) : 0;
    positions[node.id] = { x: 210 + index * step, y: 235 + (index % 2) * 40 };
  });
  return positions;
};

export const SyndicateGraph: React.FC<SyndicateGraphProps> = ({
  graphData,
  simulatedMerchants,
  onSelectMerchantForAI,
}) => {
  const [selected, setSelected] = useState<SyndicateNode | null>(null);
  const positions = useMemo(() => (graphData ? layout(graphData.nodes) : {}), [graphData]);

  if (!graphData) {
    return (
      <div className="bf-card rounded-2xl p-12 text-center text-neutral-400 font-mono text-xs">
        Loading simulated network topology...
      </div>
    );
  }

  const merchantCount = graphData.nodes.filter(node => node.type === 'MERCHANT').length;

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pt-4 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="bf-kicker text-neutral-400">[ 03 / SYNDICATE GRAPH ]</span>
              <span className="text-xs font-mono text-rose-300 flex items-center gap-1">
                <FlaskConical className="w-3 h-3" /> SIM-ONLY NODES
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
              Simulated syndicate topology.
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
              {merchantCount} <span className="font-mono">SIM-*</span> merchants, {graphData.nodes.filter(n => n.type === 'PAYER_CLUSTER').length} payer
              clusters, one simulated hub and one simulated device pool. Real OpenStreetMap businesses are not part of
              this graph.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Flagged SIM node
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Control SIM node
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bf-card rounded-2xl p-4 lg:col-span-2 relative overflow-hidden min-h-[500px] flex items-center justify-center bg-[#07070A]">
          <svg className="w-full h-[470px]" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label="Simulated syndicate graph">
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
            </defs>

            {graphData.links.map((link, index) => {
              const source = positions[link.source];
              const target = positions[link.target];
              if (!source || !target) return null;
              const suspicious = link.relationship === 'FUNDS_ROUTED' || link.relationship === 'SHARED_DEVICE';
              return (
                <line
                  key={index}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={suspicious ? '#f43f5e' : '#3f3f46'}
                  strokeWidth={suspicious ? 2 : 1.2}
                  strokeDasharray={link.relationship === 'SHARED_DEVICE' ? '4,4' : undefined}
                  strokeOpacity={0.65}
                />
              );
            })}

            {graphData.nodes.map(node => {
              const position = positions[node.id] ?? { x: VIEW_WIDTH / 2, y: 230 };
              const isSelected = selected?.id === node.id;
              const isAggregator = node.type === 'SYNDICATE_AGGREGATOR';
              const isSafe = node.riskScore < 30;
              const fill = isAggregator ? 'url(#roseGrad)' : isSafe ? 'url(#emeraldGrad)' : 'url(#amberGrad)';
              const badge = isAggregator
                ? 'HUB'
                : node.type === 'PAYER_CLUSTER'
                  ? 'RING'
                  : node.type === 'IP_SUBNET'
                    ? 'DEV'
                    : 'SIM';
              return (
                <g
                  key={node.id}
                  transform={`translate(${position.x}, ${position.y})`}
                  className="cursor-pointer"
                  onClick={() => setSelected(node)}
                >
                  <circle r={isAggregator ? 24 : 16} fill={fill} stroke={isSelected ? '#ffffff' : '#0B0B0E'} strokeWidth={isSelected ? 3 : 2} />
                  <text textAnchor="middle" dy=".32em" fill="#ffffff" fontSize="9px" fontWeight="bold" fontFamily="monospace">
                    {badge}
                  </text>
                  <text y={isAggregator ? 36 : 28} textAnchor="middle" fill="#ededed" fontSize="10px" fontFamily="sans-serif">
                    {node.name.length > 24 ? `${node.name.slice(0, 22)}...` : node.name}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="absolute bottom-4 left-4 text-[11px] font-mono text-neutral-400 bg-neutral-900/90 px-3 py-1.5 rounded-full border border-white/[0.08] flex items-center gap-2">
            <Info className="w-3.5 h-3.5" /> Click a node for simulated details
          </div>
        </div>

        <div className="bf-card rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <span className="bf-kicker">[ NODE INSPECTOR ]</span>
            {selected ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">{selected.type}</span>
                  <h4 className="text-lg font-bold text-white mt-1">{selected.name}</h4>
                  <p className="text-[11px] font-mono text-neutral-400 mt-1">{selected.category}</p>
                  <p className="text-[10px] font-mono text-rose-300 mt-1">SIMULATED RECORD · {selected.id}</p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.08]">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Simulated risk</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-bold font-mono ${selected.riskScore >= 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {selected.riskScore}/100
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full ${
                      selected.riskScore >= 70 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {selected.riskScore >= 70 ? 'Flagged SIM node' : 'Control SIM node'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-4 rounded-xl border border-white/[0.06]">
                  {selected.details}
                </p>
                {selected.type === 'MERCHANT' && simulatedMerchants.some(m => m.id === selected.id) && (
                  <button
                    onClick={() => onSelectMerchantForAI(selected.id)}
                    className="w-full bf-pill-btn bf-pill-btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Run simulated investigation
                  </button>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-neutral-500 text-xs space-y-3">
                <Radio className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
                <p>Select a node to see its simulated edges and risk score.</p>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-white/[0.08] text-[11px] text-neutral-400 space-y-1">
            <span className="font-semibold text-neutral-300 block font-mono uppercase text-[10px]">Graph scope</span>
            <p className="leading-relaxed">
              Nodes come from <span className="font-mono">GET /api/syndicate/graph</span>. The backend builds the graph from
              the SIM catalogue only, so no real OSM identity can appear here.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
