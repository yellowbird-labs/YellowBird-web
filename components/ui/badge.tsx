import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'queued' | 'running' | 'completed' | 'failed' | 'retrying';
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'default',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantClasses: Record<string, string> = {
    default: 'bg-zinc-800 text-zinc-200 border-zinc-700/60',
    secondary: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    outline: 'border-zinc-800 text-zinc-400 bg-transparent',
    queued: 'bg-zinc-900/90 text-zinc-400 border-zinc-800',
    running: 'bg-blue-950/70 text-blue-300 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    completed: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50',
    failed: 'bg-rose-950/70 text-rose-300 border-rose-500/60',
    retrying: 'bg-amber-950/70 text-amber-300 border-amber-500/50',
  };

  const dotClasses: Record<string, string> = {
    default: 'bg-zinc-400',
    secondary: 'bg-zinc-500',
    outline: 'bg-zinc-500',
    queued: 'bg-zinc-500',
    running: 'bg-blue-400 animate-pulse',
    completed: 'bg-emerald-400',
    failed: 'bg-rose-400',
    retrying: 'bg-amber-400 animate-pulse',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium border transition-colors',
        variantClasses[variant] || variantClasses.default,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('size-1.5 rounded-full shrink-0', dotClasses[variant] || 'bg-zinc-400')}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}
