import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  variant?: 'default' | 'running' | 'completed' | 'failed' | 'neutral';
  trend?: string;
}

export function StatCard({
  title,
  value,
  sublabel,
  icon: Icon,
  variant = 'default',
  trend,
}: StatCardProps) {
  const accentClasses = {
    default: 'text-zinc-100 border-zinc-800 bg-zinc-950/70',
    running: 'text-blue-400 border-blue-900/40 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
    completed: 'text-emerald-400 border-emerald-900/40 bg-emerald-950/20',
    failed: 'text-rose-400 border-rose-900/40 bg-rose-950/20',
    neutral: 'text-zinc-400 border-zinc-800/80 bg-zinc-900/30',
  };

  const iconBgClasses = {
    default: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    running: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
    completed: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
    failed: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
    neutral: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-[border-color,background-color] duration-150',
        accentClasses[variant]
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
          {title}
        </span>
        <div className={cn('flex size-7 items-center justify-center rounded-md border', iconBgClasses[variant])}>
          <Icon className="size-3.5" />
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <span className="text-2xl font-bold font-mono tracking-tight text-zinc-100 tabular-nums">
          {value}
        </span>
        {trend ? (
          <span className="text-[11px] font-mono text-zinc-500">{trend}</span>
        ) : null}
      </div>

      {sublabel ? (
        <p className="mt-1 text-[11px] text-zinc-400 truncate">{sublabel}</p>
      ) : null}
    </div>
  );
}
