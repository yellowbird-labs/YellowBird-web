import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40',
        className
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 mb-3">
        <Icon className="size-5" />
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 font-mono">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-zinc-400 text-pretty">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
