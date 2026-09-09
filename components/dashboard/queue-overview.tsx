import React from 'react';
import { QueueMetrics } from '@/types/worker';
import { Radio, Database, CheckCircle2, AlertOctagon, Clock } from 'lucide-react';

export interface QueueOverviewProps {
  metrics: QueueMetrics;
}

export function QueueOverview({ metrics }: QueueOverviewProps) {
  return (
    <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-850/80 pb-3">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-zinc-400" />
          <h2 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-200">
            Redis Streams Queue Telemetry
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          STREAM HEALTHY
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 uppercase">
            <Radio className="size-3 text-blue-400" />
            Stream Lag
          </div>
          <div className="text-lg font-bold font-mono text-zinc-100 tabular-nums">
            {metrics.redisStreamLagMs} <span className="text-xs font-normal text-zinc-500">ms</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">Consumer group latency</p>
        </div>

        <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 uppercase">
            <Clock className="size-3 text-yellow-400" />
            Pending In Queue
          </div>
          <div className="text-lg font-bold font-mono text-zinc-100 tabular-nums">
            {metrics.totalQueued} <span className="text-xs font-normal text-zinc-500">jobs</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">{metrics.pendingAcks} pending ACKs</p>
        </div>

        <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 uppercase">
            <CheckCircle2 className="size-3 text-emerald-400" />
            Completed (24h)
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
            {metrics.totalCompleted24h}
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">100% SLA target</p>
        </div>

        <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 uppercase">
            <AlertOctagon className="size-3 text-rose-400" />
            Failed / Retries
          </div>
          <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">
            {metrics.totalFailed24h}
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">99.2% success rate</p>
        </div>
      </div>
    </div>
  );
}
