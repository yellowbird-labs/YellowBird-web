import React from 'react';
import { Job } from '@/types/jobs';
import { JOB_TYPE_CONFIG, JOB_STATUS_CONFIG } from '@/lib/tokens';
import { JobStatusBadge } from './job-status-badge';
import { formatDuration, formatBytes } from '@/lib/utils';
import {
  Image,
  Film,
  Video,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Server,
} from 'lucide-react';
import Link from 'next/link';

export interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const typeConfig = JOB_TYPE_CONFIG[job.type];
  const statusConfig = JOB_STATUS_CONFIG[job.status];

  const getJobIcon = () => {
    switch (job.type) {
      case 'thumbnail':
        return Image;
      case 'preview':
        return Film;
      default:
        return Video;
    }
  };

  const Icon = getJobIcon();

  return (
    <div
      className={`rounded-xl border bg-zinc-950/70 p-4 transition-all duration-200 flex flex-col justify-between space-y-3 ${
        job.status === 'running'
          ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30'
          : job.status === 'completed'
          ? 'border-zinc-800/80 hover:border-zinc-700'
          : job.status === 'failed' || job.status === 'retrying'
          ? 'border-rose-900/50 bg-rose-950/10'
          : 'border-zinc-850/80 opacity-80'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs ${
              job.status === 'running'
                ? 'bg-blue-900/40 border-blue-600/50 text-blue-300'
                : job.status === 'completed'
                ? 'bg-emerald-950 border-emerald-700/50 text-emerald-400'
                : job.status === 'failed' || job.status === 'retrying'
                ? 'bg-rose-950 border-rose-700/60 text-rose-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
          >
            <Icon className="size-4" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <h4 className="text-xs font-mono font-semibold text-zinc-100 truncate">
              {typeConfig.label}
            </h4>
            <p className="text-[10px] font-mono text-zinc-400 truncate">
              {typeConfig.resolution}
            </p>
          </div>
        </div>

        <JobStatusBadge status={job.status} size="sm" />
      </div>

      {/* Progress Bar for Active Transcodes */}
      {job.status === 'running' ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-blue-400">
            <span>Encoding / FFmpeg</span>
            <span className="tabular-nums font-bold">{job.progressPercent}%</span>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-blue-900/40">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.8)]"
              style={{ width: `${job.progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Error & Retry Banner */}
      {job.errorMessage ? (
        <div className="rounded-md border border-rose-900/50 bg-rose-950/40 p-2 text-[10px] font-mono text-rose-300 space-y-0.5">
          <div className="flex items-center gap-1 font-semibold text-rose-400">
            <AlertTriangle className="size-3 shrink-0" />
            <span>Attempt Error</span>
          </div>
          <p className="line-clamp-2 text-rose-300/80">{job.errorMessage}</p>
        </div>
      ) : null}

      {/* Rendition Output Summary */}
      {job.output ? (
        <div className="rounded-md border border-zinc-850 bg-zinc-900/40 px-2.5 py-1.5 flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-400">Output Size</span>
          <span className="text-emerald-400 font-semibold tabular-nums">
            {formatBytes(job.output.fileSizeBytes)}
          </span>
        </div>
      ) : null}

      {/* Meta Specs Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-500 border-t border-zinc-850/60 pt-2.5">
        <div className="flex items-center gap-1 truncate">
          <Server className="size-3 text-zinc-600 shrink-0" />
          <span>Worker:</span>
          <span className="text-zinc-300 truncate">{job.workerId || 'queued'}</span>
        </div>

        <div className="flex items-center justify-end gap-1 tabular-nums">
          <Clock className="size-3 text-zinc-600 shrink-0" />
          <span>Duration:</span>
          <span className="text-zinc-300 font-medium">
            {job.durationSeconds ? formatDuration(job.durationSeconds) : '—'}
          </span>
        </div>

        <div className="col-span-2 flex items-center justify-between pt-1 border-t border-zinc-900">
          <span>
            Attempt:{' '}
            <span className="text-zinc-300 tabular-nums">
              {job.attemptCount} / {job.maxAttempts}
            </span>
          </span>

          <Link
            href={`/jobs/${job.id}`}
            className="text-zinc-400 hover:text-white flex items-center gap-1 text-[10px] font-mono hover:underline"
          >
            Details <ArrowRight className="size-2.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
