import React, { useMemo, useState } from 'react';
import { ExternalLink, FlaskConical, Info, Radio, RotateCcw, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimulatedMerchant, SyndicateGraphType, SyndicateNode } from '../types';
import { SpotlightCard } from './reactbits/SpotlightCard';
import { DecryptedText } from './reactbits/DecryptedText';
import { CountUp } from './reactbits/CountUp';

interface SyndicateGraphProps {
  graphData: SyndicateGraphType | null;
  simulatedMerchants: SimulatedMerchant[];
  onSelectMerchantForAI: (merchantId: string) => void;
}

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 460;

type EdgeFilter = 'ALL' | 'SUSPICIOUS' | 'SHARED_DEVICE';

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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>('ALL');

  const positions = useMemo(() => (graphData ? layout(graphData.nodes) : {}), [graphData]);

  const activeNodeId = hoveredId ?? selected?.id ?? null;

  const visibleLinks = useMemo(() => {
    if (!graphData) return [];
    return graphData.links.filter(link => {
      if (edgeFilter === 'SUSPICIOUS') {
        return link.relationship === 'FUNDS_ROUTED' || link.relationship === 'SHARED_DEVICE';
      }
      if (edgeFilter === 'SHARED_DEVICE') {
        return link.relationship === 'SHARED_DEVICE';
      }
      return true;
    });
  }, [graphData, edgeFilter]);

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!activeNodeId) return ids;
    ids.add(activeNodeId);
    visibleLinks.forEach(link => {
      if (link.source === activeNodeId) ids.add(link.target);
      if (link.target === activeNodeId) ids.add(link.source);
    });
    return ids;
  }, [activeNodeId, visibleLinks]);

  const selectedNeighbors = useMemo(() => {
    if (!selected || !graphData) return [];
    const nodeById = new Map(graphData.nodes.map(n => [n.id, n]));
    const neighbors: Array<{ node: SyndicateNode; relationship: string }> = [];
    const seen = new Set<string>();
    graphData.links.forEach(link => {
      const otherId = link.source === selected.id ? link.target : link.target === selected.id ? link.source : null;
      if (otherId && !seen.has(otherId)) {
        const other = nodeById.get(otherId);
        if (other) {
          seen.add(otherId);
          neighbors.push({ node: other, relationship: link.relationship });
        }
      }
    });
    return neighbors;
  }, [selected, graphData]);

  if (!graphData) {
    return (
      <div className="bf-card rounded-2xl p-12 text-center text-neutral-400 font-mono text-xs">
        Loading simulated network topology...
      </div>
    );
  }

  const merchantCount = graphData.nodes.filter(node => node.type === 'MERCHANT').length;
  const hoveredNode = hoveredId ? graphData.nodes.find(n => n.id === hoveredId) ?? null : null;

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pt-4 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bf-kicker text-neutral-400">[ 03 / SYNDICATE GRAPH ]</span>
              <span className="text-xs font-mono text-rose-300 flex items-center gap-1">
                <FlaskConical className="w-3 h-3" /> SIM-ONLY NODES
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
              Simulated syndicate topology.
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
              {merchantCount} <span className="font-mono">SIM-*</span> merchants,{' '}
              {graphData.nodes.filter(n => n.type === 'PAYER_CLUSTER').length} payer clusters, one simulated hub and one
              simulated device pool. Real OpenStreetMap businesses are not part of this graph.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono shrink-0">
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
        <SpotlightCard
          spotlightColor="rgba(244, 63, 94, 0.12)"
          className="bf-card rounded-2xl p-3 sm:p-4 lg:col-span-2 min-h-[300px] sm:min-h-[420px] lg:min-h-[520px] flex flex-col justify-between bg-[#07070A]"
        >
          {/* Interactive edge filter toolbar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: `All edges (${graphData.links.length})` },
                { id: 'SUSPICIOUS', label: 'Suspicious flows' },
                { id: 'SHARED_DEVICE', label: 'Shared device' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEdgeFilter(tab.id as EdgeFilter)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all ${
                    edgeFilter === tab.id
                      ? 'bg-white text-black border-white font-semibold shadow-sm'
                      : 'bg-neutral-900/80 text-neutral-400 border-white/[0.08] hover:text-white hover:border-white/20'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {selected && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-neutral-900/90 text-neutral-300 border border-white/10 hover:text-white hover:border-white/25 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Clear focus
              </button>
            )}
          </div>

          <div className="relative flex-1 flex items-center justify-center">
            <svg
              className="w-full h-[240px] sm:h-[360px] lg:h-[440px]"
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
              role="img"
              aria-label="Simulated syndicate graph"
            >
              <defs>
                <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#be123c" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {visibleLinks.map((link, index) => {
                const source = positions[link.source];
                const target = positions[link.target];
                if (!source || !target) return null;
                const suspicious = link.relationship === 'FUNDS_ROUTED' || link.relationship === 'SHARED_DEVICE';
                const isConnectedToActive =
                  !activeNodeId || link.source === activeNodeId || link.target === activeNodeId;
                return (
                  <line
                    key={`${link.source}-${link.target}-${index}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={suspicious ? '#f43f5e' : '#52525b'}
                    strokeWidth={isConnectedToActive && activeNodeId ? (suspicious ? 2.8 : 1.8) : suspicious ? 2 : 1.2}
                    strokeDasharray={link.relationship === 'SHARED_DEVICE' ? '5,5' : undefined}
                    strokeOpacity={activeNodeId ? (isConnectedToActive ? 0.95 : 0.14) : 0.65}
                    className="transition-all duration-300"
                  />
                );
              })}

              {graphData.nodes.map(node => {
                const position = positions[node.id] ?? { x: VIEW_WIDTH / 2, y: 230 };
                const isSelected = selected?.id === node.id;
                const isHovered = hoveredId === node.id;
                const isDimmed = Boolean(activeNodeId && !connectedNodeIds.has(node.id));
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
                const baseRadius = isAggregator ? 24 : 16;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${position.x}, ${position.y})`}
                    className="cursor-pointer transition-opacity duration-300"
                    style={{ opacity: isDimmed ? 0.25 : 1 }}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(prev => (prev === node.id ? null : prev))}
                    onClick={() => setSelected(prev => (prev?.id === node.id ? null : node))}
                  >
                    {(isSelected || isHovered) && (
                      <circle
                        r={baseRadius + 7}
                        fill="none"
                        stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.45)'}
                        strokeWidth={1.5}
                        strokeDasharray={isSelected ? undefined : '3,3'}
                      />
                    )}
                    <circle
                      r={isHovered ? baseRadius + 2 : baseRadius}
                      fill={fill}
                      stroke={isSelected ? '#ffffff' : '#0B0B0E'}
                      strokeWidth={isSelected ? 3 : 2}
                    />
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
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900/90 px-3 py-1.5 rounded-full border border-white/[0.08] flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                {hoveredNode
                  ? `${hoveredNode.name} · Risk ${hoveredNode.riskScore}/100`
                  : 'Hover to trace edges · Click a node to inspect'}
              </span>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard
          spotlightColor={selected && selected.riskScore < 30 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(244, 63, 94, 0.14)'}
          className="bf-card rounded-2xl p-6 flex flex-col justify-between space-y-6"
        >
          <div className="relative z-10 space-y-4">
            <span className="bf-kicker">[ NODE INSPECTOR ]</span>
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                      {selected.type}
                    </span>
                    <h4 className="text-lg font-bold text-white mt-1">
                      <DecryptedText text={selected.name} speed={22} maxIterations={8} />
                    </h4>
                    <p className="text-[11px] font-mono text-neutral-400 mt-1">{selected.category}</p>
                    <p className="text-[10px] font-mono text-rose-300 mt-1">
                      SIMULATED RECORD · <DecryptedText text={selected.id} speed={20} maxIterations={7} />
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/[0.08]">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Simulated risk</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`text-3xl font-bold font-mono ${
                          selected.riskScore >= 70 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        <CountUp to={selected.riskScore} duration={0.55} />/100
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full ${
                          selected.riskScore >= 70
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {selected.riskScore >= 70 ? 'Flagged SIM node' : 'Control SIM node'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-4 rounded-xl border border-white/[0.06]">
                    {selected.details}
                  </p>

                  {selectedNeighbors.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                        <Network className="w-3 h-3 text-rose-400" /> Connected nodes ({selectedNeighbors.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNeighbors.map(({ node, relationship }) => (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => setSelected(node)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-white/[0.08] hover:border-white/25 text-[10px] font-mono text-neutral-200 transition-colors text-left"
                            title={relationship}
                          >
                            {node.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.type === 'MERCHANT' && simulatedMerchants.some(m => m.id === selected.id) && (
                    <button
                      onClick={() => onSelectMerchantForAI(selected.id)}
                      className="w-full bf-pill-btn bf-pill-btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Run simulated investigation
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-16 text-center text-neutral-500 text-xs space-y-3"
                >
                  <Radio className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
                  <p>Select a node to see its simulated edges and risk score.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SpotlightCard>
      </section>
    </div>
  );
};
