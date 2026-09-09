import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, Check, CircleDot, AlertTriangle } from 'lucide-react';

export type StageState = 'pending' | 'active' | 'completed' | 'failed';

export interface PipelineStageProps {
  stageId: string;
  stepNumber: number;
  label: string;
  sublabel: string;
  description?: string;
  state: StageState;
  icon: LucideIcon;
  isLast?: boolean;
}

export function PipelineStageItem({
  stepNumber,
  label,
  sublabel,
  state,
  icon: Icon,
  isLast = false,
}: PipelineStageProps) {
  const stateStyles = {
    pending: {
      card: 'border-zinc-850/80 bg-zinc-900/30 text-zinc-500',
      iconBg: 'bg-zinc-900 border-zinc-800 text-zinc-600',
      badge: 'border-zinc-800 text-zinc-600 bg-zinc-900/60',
      connector: 'bg-zinc-850',
    },
    active: {
      card: 'border-blue-500/60 bg-blue-950/30 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/40',
      iconBg: 'bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse',
      badge: 'border-blue-500/50 text-blue-300 bg-blue-950/80',
      connector: 'bg-gradient-to-r from-blue-500 to-zinc-700',
    },
    completed: {
      card: 'border-emerald-600/40 bg-emerald-950/20 text-emerald-300',
      iconBg: 'bg-emerald-950 text-emerald-400 border-emerald-600/60',
      badge: 'border-emerald-600/50 text-emerald-300 bg-emerald-950/80',
      connector: 'bg-emerald-600/60',
    },
    failed: {
      card: 'border-rose-600/60 bg-rose-950/25 text-rose-300',
      iconBg: 'bg-rose-950 text-rose-400 border-rose-600',
      badge: 'border-rose-600/60 text-rose-300 bg-rose-950/80',
      connector: 'bg-rose-800',
    },
  };

  const style = stateStyles[state];

  return (
    <div className="relative flex-1 flex flex-col min-w-[130px] group">
      {/* Node Card */}
      <div
        className={cn(
          'relative rounded-xl border p-3 flex flex-col justify-between transition-all duration-300 ease-out min-h-[96px]',
          style.card
        )}
      >
        {/* Active Stage Indicator Glow */}
        {state === 'active' && (
          <span className="absolute -top-1 -right-1 flex size-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-3 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          </span>
        )}

        {/* Top Header */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className={cn('flex size-6 items-center justify-center rounded-md border text-xs', style.iconBg)}>
              {state === 'completed' ? (
                <Check className="size-3.5 stroke-[3]" />
              ) : state === 'failed' ? (
                <AlertTriangle className="size-3.5" />
              ) : state === 'active' ? (
                <CircleDot className="size-3.5" />
              ) : (
                <Icon className="size-3.5" />
              )}
            </div>
            <span className="text-[10px] font-mono text-zinc-500 font-medium tabular-nums">
              0{stepNumber}
            </span>
          </div>

          <span
            className={cn(
              'text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium',
              style.badge
            )}
          >
            {state}
          </span>
        </div>

        {/* Label & Sublabel */}
        <div className="mt-2 space-y-0.5">
          <h4 className="text-xs font-mono font-bold tracking-tight text-zinc-100 truncate">
            {label}
          </h4>
          <p className="text-[10px] font-mono text-zinc-400 truncate">
            {sublabel}
          </p>
        </div>
      </div>

      {/* Inter-stage Connector Line (desktop) */}
      {!isLast && (
        <div
          className={cn(
            'hidden lg:block absolute top-1/2 -right-3 w-6 h-[2px] z-10 -translate-y-1/2 transition-colors duration-300',
            style.connector
          )}
        />
      )}
    </div>
  );
}
