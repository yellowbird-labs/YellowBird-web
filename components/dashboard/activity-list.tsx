import React from 'react';
import { Job } from '@/types/jobs';
import { JOB_STATUS_CONFIG, JOB_TYPE_CONFIG } from '@/lib/tokens';
import { Activity, Clock, ArrowRight, Film } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export interface ActivityListProps {
  recentJobs: Job[];
}

export function ActivityList({ recentJobs }: ActivityListProps) {
  return (
    <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-850/80 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-zinc-400" />
          <h2 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-200">
            Live Stream Activity
          </h2>
        </div>
        <Link
          href="/jobs"
          className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
        >
          View all jobs
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="divide-y divide-zinc-900 overflow-hidden">
        {recentJobs.slice(0, 6).map((job) => {
          const statusConfig = JOB_STATUS_CONFIG[job.status];
          const typeConfig = JOB_TYPE_CONFIG[job.type];

          return (
            <div
              key={job.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2 hover:bg-zinc-900/30 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 border border-zinc-850 text-zinc-400">
                  <Film className="size-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/media/${job.mediaId}`}
                      className="text-xs font-mono font-medium text-zinc-200 hover:text-white truncate block max-w-[200px] sm:max-w-[280px]"
                    >
                      {job.input.filename}
                    </Link>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 shrink-0">
                      {typeConfig.shortLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                    <span>Job ID: {job.id.slice(0, 16)}</span>
                    {job.workerId ? (
                      <>
                        <span>•</span>
                        <span className="text-zinc-400">{job.workerId}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${statusConfig.badgeClass}`}>
                  <span className={`size-1.5 rounded-full ${statusConfig.dotClass}`} />
                  {statusConfig.label}
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 shrink-0 tabular-nums">
                  <Clock className="size-3" />
                  <span>{formatRelativeTime(job.completedAt || job.startedAt || job.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
