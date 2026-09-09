import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'System Error',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center rounded-xl border border-rose-900/40 bg-rose-950/20',
        className
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-rose-950 border border-rose-800/60 text-rose-400 mb-2.5">
        <AlertTriangle className="size-4" />
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-300 font-mono">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-xs text-rose-300/80 text-pretty font-mono">
        {message}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-3.5 text-rose-300 border-rose-800/60 hover:bg-rose-900/40">
          Retry Request
        </Button>
      ) : null}
    </div>
  );
}
