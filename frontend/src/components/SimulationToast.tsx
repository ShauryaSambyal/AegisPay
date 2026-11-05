import React from 'react';
import { AlertTriangle, CheckCircle, Flame, RotateCcw, Sparkles, X, ArrowRight } from 'lucide-react';
import { ScenarioName } from '../api';

export interface ToastState {
  scenario: ScenarioName;
  title: string;
  description: string;
  badge: string;
  type: 'danger' | 'success' | 'warning' | 'info';
}

interface SimulationToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
  onViewStream: () => void;
}

const palette: Record<ToastState['type'], string> = {
  danger: 'bg-[#140A0D]/95 border-rose-500/40 ring-rose-500/20',
  success: 'bg-[#0A140F]/95 border-emerald-500/40 ring-emerald-500/20',
  warning: 'bg-[#141005]/95 border-amber-500/40 ring-amber-500/20',
  info: 'bg-[#0D0D11]/95 border-white/20 ring-white/10',
};

export const SimulationToast: React.FC<SimulationToastProps> = ({ toast, onDismiss, onViewStream }) => {
  if (!toast) return null;

  const icon =
    toast.type === 'danger' ? (
      <Flame className="w-5 h-5 animate-pulse" />
    ) : toast.type === 'success' ? (
      <Sparkles className="w-5 h-5" />
    ) : toast.type === 'warning' ? (
      <AlertTriangle className="w-5 h-5" />
    ) : (
      <RotateCcw className="w-5 h-5" />
    );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl animate-dropdown-enter">
      <div className={`p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl flex items-start justify-between gap-4 ring-1 ${palette[toast.type]}`}>
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-white">{icon}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border border-white/20 bg-white/5 text-neutral-200">
                {toast.badge}
              </span>
              <span className="text-xs font-bold text-white truncate">{toast.title}</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{toast.description}</p>
            {toast.scenario !== 'RESET' && (
              <button
                onClick={() => {
                  onViewStream();
                  onDismiss();
                }}
                className="mt-2 text-xs font-mono text-white hover:text-emerald-400 flex items-center gap-1.5 underline underline-offset-4"
              >
                View injected transactions <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <button onClick={onDismiss} aria-label="Dismiss" className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
