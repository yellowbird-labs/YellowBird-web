'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertOctagon } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-4 font-mono">
      <div className="flex size-12 items-center justify-center rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
        <AlertOctagon className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-rose-300 uppercase tracking-wider">
          Runtime Stream Interrupted
        </h2>
        <p className="text-xs text-zinc-400 max-w-md">
          {error.message || 'An unexpected error occurred while rendering the processing pipeline.'}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => reset()}
        className="font-mono text-xs border-zinc-800"
      >
        Retry Render
      </Button>
    </div>
  );
}
