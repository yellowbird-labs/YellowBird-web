'use client';

import React from 'react';
import { MediaItem } from '@/types/media';
import { PipelineStageItem, StageState } from './pipeline-stage';
import {
  UploadCloud,
  Database,
  Layers,
  Cpu,
  Tv,
  CheckCircle,
} from 'lucide-react';

export interface ProcessingPipelineProps {
  media: MediaItem;
}

export function ProcessingPipeline({ media }: ProcessingPipelineProps) {
  // Derive exact stage states from media and child jobs
  const jobs = media.jobs || [];
  const completedJobsCount = jobs.filter((j) => j.status === 'completed').length;
  const runningJobsCount = jobs.filter((j) => j.status === 'running').length;
  const failedJobsCount = jobs.filter((j) => j.status === 'failed').length;
  const retryingJobsCount = jobs.filter((j) => j.status === 'retrying').length;
  const queuedJobsCount = jobs.filter((j) => j.status === 'queued').length;

  let uploadState: StageState = 'completed';
  let storageState: StageState = 'completed';
  let queueState: StageState = 'pending';
  let workerState: StageState = 'pending';
  let ffmpegState: StageState = 'pending';
  let renditionsState: StageState = 'pending';

  if (media.status === 'uploaded') {
    uploadState = 'active';
    storageState = 'pending';
    queueState = 'pending';
    workerState = 'pending';
    ffmpegState = 'pending';
    renditionsState = 'pending';
  } else if (media.status === 'queued') {
    uploadState = 'completed';
    storageState = 'completed';
    queueState = 'active';
    workerState = 'pending';
    ffmpegState = 'pending';
    renditionsState = 'pending';
  } else if (media.status === 'processing') {
    uploadState = 'completed';
    storageState = 'completed';

    if (queuedJobsCount > 0) {
      queueState = 'active';
    } else {
      queueState = 'completed';
    }

    if (runningJobsCount > 0 || retryingJobsCount > 0) {
      workerState = 'active';
      ffmpegState = 'active';
    } else if (completedJobsCount > 0) {
      workerState = 'completed';
      ffmpegState = 'completed';
    }

    if (completedJobsCount === 5) {
      renditionsState = 'completed';
    } else if (completedJobsCount > 0) {
      renditionsState = 'active';
    }
  } else if (media.status === 'ready') {
    uploadState = 'completed';
    storageState = 'completed';
    queueState = 'completed';
    workerState = 'completed';
    ffmpegState = 'completed';
    renditionsState = 'completed';
  } else if (media.status === 'failed') {
    uploadState = 'completed';
    storageState = 'completed';
    queueState = 'completed';
    workerState = failedJobsCount > 0 ? 'failed' : 'completed';
    ffmpegState = failedJobsCount > 0 ? 'failed' : 'completed';
    renditionsState = 'failed';
  }

  return (
    <div className="rounded-xl border border-zinc-850 bg-zinc-950/80 p-5 space-y-4 shadow-xl">
      {/* Pipeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-850 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-100">
              Distributed Processing Pipeline
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-850 text-zinc-400">
              Go Engine + Redis + FFmpeg
            </span>
          </div>
          <p className="text-[11px] font-mono text-zinc-400">
            Real-time stage transitions derived from distributed worker telemetry
          </p>
        </div>

        {/* Progress summary pill */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span>Jobs:</span>
            <span className="text-emerald-400 font-bold tabular-nums">{completedJobsCount}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200 tabular-nums">5 Done</span>
          </div>
          <div className="w-24 bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${media.overallProgressPercent}%` }}
            />
          </div>
          <span className="text-blue-400 font-bold tabular-nums">
            {media.overallProgressPercent}%
          </span>
        </div>
      </div>

      {/* Connected 6 Stages */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
        <PipelineStageItem
          stepNumber={1}
          stageId="upload"
          label="INGEST"
          sublabel="Browser -> Go API"
          state={uploadState}
          icon={UploadCloud}
        />
        <PipelineStageItem
          stepNumber={2}
          stageId="storage"
          label="STORAGE"
          sublabel="PostgreSQL + NVMe"
          state={storageState}
          icon={Database}
        />
        <PipelineStageItem
          stepNumber={3}
          stageId="queue"
          label="QUEUE"
          sublabel="Redis Streams"
          state={queueState}
          icon={Layers}
        />
        <PipelineStageItem
          stepNumber={4}
          stageId="worker"
          label="WORKER"
          sublabel="XREADGROUP Claim"
          state={workerState}
          icon={Cpu}
        />
        <PipelineStageItem
          stepNumber={5}
          stageId="ffmpeg"
          label="FFMPEG"
          sublabel="Transcode & Scale"
          state={ffmpegState}
          icon={Tv}
        />
        <PipelineStageItem
          stepNumber={6}
          stageId="renditions"
          label="RENDITIONS"
          sublabel="Cloudinary / CDN"
          state={renditionsState}
          icon={CheckCircle}
          isLast
        />
      </div>
    </div>
  );
}
