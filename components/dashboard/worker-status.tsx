import React from 'react';
import { WorkerInfo } from '@/types/worker';
import { WORKER_STATUS_CONFIG } from '@/lib/tokens';
import { Cpu, Server, Activity, HardDrive } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import Link from 'next/link';

export interface WorkerStatusProps {
  workers: WorkerInfo[];
}

export function WorkerStatusList({ workers }: WorkerStatusProps) {
  return (
    <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-850/80 pb-3">
        <div className="flex items-center gap-2">
          <Server className="size-4 text-zinc-400" />
          <h2 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-200">
            Distributed Workers
          </h2>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          {workers.filter((w) => w.status === 'running').length} / {workers.length} active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {workers.map((worker) => {
          const config = WORKER_STATUS_CONFIG[worker.status];

          return (
            <div
              key={worker.id}
              className="rounded-lg border border-zinc-850 bg-zinc-900/40 p-3.5 space-y-3 hover:border-zinc-800 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-semibold text-zinc-200">
                      {worker.id}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 block truncate max-w-[140px]">
                    {worker.hostname}
                  </span>
                </div>

                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${config.badgeClass}`}>
                  <span className={`size-1.5 rounded-full ${config.dotClass}`} />
                  {config.label}
                </div>
              </div>

              {/* Current Job Assignment */}
              <div className="rounded bg-zinc-950/70 border border-zinc-850/60 p-2 text-xs space-y-1">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  Current Task
                </div>
                {worker.currentJobType ? (
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono font-medium text-blue-400">
                      <span>{worker.currentJobType.toUpperCase()} TRANSCODE</span>
                      {worker.currentProgressPercent ? (
                        <span className="tabular-nums">{worker.currentProgressPercent}%</span>
                      ) : null}
                    </div>
                    {worker.currentMediaFilename ? (
                      <span className="text-[10px] text-zinc-400 font-mono truncate block mt-0.5">
                        {worker.currentMediaFilename}
                      </span>
                    ) : null}
                    {worker.currentProgressPercent ? (
                      <div className="w-full bg-zinc-800 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${worker.currentProgressPercent}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-500 italic">
                    Awaiting Redis stream event...
                  </span>
                )}
              </div>

              {/* Resource Metrics */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-850/50">
                <div className="flex items-center gap-1.5">
                  <Cpu className="size-3 text-zinc-500" />
                  <span>CPU:</span>
                  <span className="text-zinc-200 tabular-nums font-semibold">{worker.cpuUsagePercent}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HardDrive className="size-3 text-zinc-500" />
                  <span>RAM:</span>
                  <span className="text-zinc-200 tabular-nums">{worker.memoryUsageMb} MB</span>
                </div>
              </div>

              {/* Footer details */}
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-850/40">
                <span>Jobs today: <span className="text-zinc-300 tabular-nums">{worker.jobsCompletedToday}</span></span>
                <span>Uptime: <span className="text-zinc-300 tabular-nums">{formatDuration(worker.uptimeSeconds)}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
