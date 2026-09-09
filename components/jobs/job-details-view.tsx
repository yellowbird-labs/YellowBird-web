import React from 'react';
import { Job } from '@/types/jobs';
import { JobStatusBadge } from '@/components/processing/job-status-badge';
import { JobTimeline } from '@/components/processing/job-timeline';
import { JOB_TYPE_CONFIG } from '@/lib/tokens';
import { formatBytes, formatDuration, formatDate } from '@/lib/utils';
import {
  FileText,
  Server,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Layers,
  Film,
  Cpu,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export interface JobDetailsViewProps {
  job: Job;
}

export function JobDetailsView({ job }: JobDetailsViewProps) {
  const typeDef = JOB_TYPE_CONFIG[job.type];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/80 p-5 rounded-xl border border-zinc-850">
        <div className="flex items-center gap-3">
          <Link
            href="/jobs"
            className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-mono font-bold text-zinc-100">
                {typeDef.label}
              </h1>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              Job ID: <span className="text-zinc-300 select-all">{job.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/media/${job.mediaId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <Film className="size-3.5 text-yellow-400" />
            <span>View Source Media</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Left Specs & Right Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Meta & Inputs/Outputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Execution Specs Card */}
          <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-5 space-y-4">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200 border-b border-zinc-850 pb-3 flex items-center gap-2">
              <Cpu className="size-4 text-zinc-400" />
              Execution Telemetry
            </h3>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-2.5 space-y-1">
                <dt className="text-[10px] text-zinc-500 uppercase">Worker Node</dt>
                <dd className="font-semibold text-zinc-200 truncate">
                  {job.workerId || 'Pending Claim'}
                </dd>
              </div>

              <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-2.5 space-y-1">
                <dt className="text-[10px] text-zinc-500 uppercase">Attempt Count</dt>
                <dd className="font-semibold text-zinc-200 tabular-nums">
                  {job.attemptCount} of {job.maxAttempts}
                </dd>
              </div>

              <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-2.5 space-y-1">
                <dt className="text-[10px] text-zinc-500 uppercase">Duration</dt>
                <dd className="font-semibold text-zinc-200 tabular-nums">
                  {job.durationSeconds ? formatDuration(job.durationSeconds) : 'In progress...'}
                </dd>
              </div>

              <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-2.5 space-y-1">
                <dt className="text-[10px] text-zinc-500 uppercase">Created</dt>
                <dd className="text-zinc-300 text-[11px] tabular-nums">
                  {formatDate(job.createdAt)}
                </dd>
              </div>

              <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-2.5 space-y-1">
                <dt className="text-[10px] text-zinc-500 uppercase">Started</dt>
                <dd className="text-zinc-300 text-[11px] tabular-nums">
                  {job.startedAt ? formatDate(job.startedAt) : '—'}
                </dd>
              </div>

              <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-2.5 space-y-1">
                <dt className="text-[10px] text-zinc-500 uppercase">Completed</dt>
                <dd className="text-zinc-300 text-[11px] tabular-nums">
                  {job.completedAt ? formatDate(job.completedAt) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Failure / Retry Log Box (if applicable) */}
          {job.errorMessage || job.attempts.some((a) => a.status === 'failed') ? (
            <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-semibold uppercase tracking-wider">
                <AlertTriangle className="size-4" />
                <span>Job Error & Attempt Breakdown</span>
              </div>

              {job.errorMessage ? (
                <div className="rounded-lg bg-black/60 border border-rose-900/40 p-3 font-mono text-xs text-rose-300 space-y-1">
                  <span className="text-[10px] text-rose-500 uppercase block font-bold">
                    Latest FFmpeg / Worker Diagnostic:
                  </span>
                  <p className="text-pretty">{job.errorMessage}</p>
                </div>
              ) : null}

              <div className="space-y-2 pt-2 border-t border-rose-900/30">
                <span className="text-[10px] font-mono text-rose-400 uppercase font-semibold">
                  Attempt History:
                </span>
                <div className="space-y-1.5">
                  {job.attempts.map((att) => (
                    <div
                      key={att.attemptNumber}
                      className="rounded border border-rose-900/30 bg-rose-950/40 p-2 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="space-y-0.5">
                        <span className="text-zinc-200 font-semibold">
                          Attempt #{att.attemptNumber} ({att.workerId})
                        </span>
                        {att.errorMessage ? (
                          <p className="text-[11px] text-rose-300">{att.errorMessage}</p>
                        ) : null}
                      </div>
                      <span className="uppercase text-[10px] font-semibold text-rose-400">
                        {att.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Input & Output Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Input */}
            <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-4 space-y-2">
              <h4 className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-850 pb-2 flex items-center gap-1.5">
                <FileText className="size-3.5 text-zinc-400" />
                Input Specifications
              </h4>
              <div className="space-y-1.5 text-xs font-mono text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">File:</span>
                  <span className="truncate max-w-[160px]">{job.input.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">MIME:</span>
                  <span>{job.input.mimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Raw Size:</span>
                  <span>{formatBytes(job.input.sizeBytes)}</span>
                </div>
              </div>
            </div>

            {/* Output */}
            <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-4 space-y-2">
              <h4 className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider border-b border-zinc-850 pb-2 flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                Output Rendition
              </h4>
              {job.output ? (
                <div className="space-y-1.5 text-xs font-mono text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Resolution:</span>
                    <span>{job.output.resolution || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Format:</span>
                    <span>{job.output.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Output Size:</span>
                    <span className="text-emerald-400 font-semibold tabular-nums">
                      {formatBytes(job.output.fileSizeBytes)}
                    </span>
                  </div>
                  <div className="pt-1">
                    <a
                      href={job.output.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                    >
                      <span>Open Cloudinary CDN URL</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-mono text-zinc-500 italic py-2">
                  No output generated yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Event Timeline */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-5 space-y-4">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200 border-b border-zinc-850 pb-3 flex items-center gap-2">
              <Clock className="size-4 text-zinc-400" />
              Lifecycle Timeline
            </h3>

            <JobTimeline events={job.timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}
