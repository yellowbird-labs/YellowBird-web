import { JobStatus, JobType } from '@/types/jobs';
import { ProcessingStatus } from '@/types/media';
import { WorkerStatus } from '@/types/worker';

export interface StatusTokenConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  iconName: 'queued' | 'running' | 'completed' | 'failed' | 'retrying';
}

export const JOB_STATUS_CONFIG: Record<JobStatus, StatusTokenConfig> = {
  queued: {
    label: 'QUEUED',
    badgeClass: 'bg-zinc-900/90 text-zinc-400 border-zinc-700/60',
    dotClass: 'bg-zinc-500',
    borderClass: 'border-zinc-800',
    bgClass: 'bg-zinc-900/40',
    textClass: 'text-zinc-400',
    iconName: 'queued',
  },
  running: {
    label: 'RUNNING',
    badgeClass: 'bg-blue-950/60 text-blue-300 border-blue-600/40',
    dotClass: 'bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.6)]',
    borderClass: 'border-blue-600/50',
    bgClass: 'bg-blue-950/20',
    textClass: 'text-blue-400',
    iconName: 'running',
  },
  completed: {
    label: 'COMPLETED',
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40',
    dotClass: 'bg-emerald-400',
    borderClass: 'border-emerald-600/40',
    bgClass: 'bg-emerald-950/20',
    textClass: 'text-emerald-400',
    iconName: 'completed',
  },
  failed: {
    label: 'FAILED',
    badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-600/50',
    dotClass: 'bg-rose-500',
    borderClass: 'border-rose-600/60',
    bgClass: 'bg-rose-950/20',
    textClass: 'text-rose-400',
    iconName: 'failed',
  },
  retrying: {
    label: 'RETRYING',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-600/40',
    dotClass: 'bg-amber-400 animate-pulse',
    borderClass: 'border-amber-600/50',
    bgClass: 'bg-amber-950/20',
    textClass: 'text-amber-400',
    iconName: 'retrying',
  },
};

export const MEDIA_STATUS_CONFIG: Record<ProcessingStatus, StatusTokenConfig> = {
  uploaded: {
    label: 'UPLOADED',
    badgeClass: 'bg-zinc-900 text-zinc-400 border-zinc-700/60',
    dotClass: 'bg-zinc-400',
    borderClass: 'border-zinc-800',
    bgClass: 'bg-zinc-900/40',
    textClass: 'text-zinc-400',
    iconName: 'queued',
  },
  queued: {
    label: 'QUEUED',
    badgeClass: 'bg-zinc-900/90 text-zinc-300 border-zinc-700',
    dotClass: 'bg-zinc-400',
    borderClass: 'border-zinc-800',
    bgClass: 'bg-zinc-900/40',
    textClass: 'text-zinc-400',
    iconName: 'queued',
  },
  processing: {
    label: 'PROCESSING',
    badgeClass: 'bg-blue-950/70 text-blue-300 border-blue-500/50',
    dotClass: 'bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.7)]',
    borderClass: 'border-blue-600/40',
    bgClass: 'bg-blue-950/20',
    textClass: 'text-blue-400',
    iconName: 'running',
  },
  ready: {
    label: 'READY',
    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50',
    dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    borderClass: 'border-emerald-600/40',
    bgClass: 'bg-emerald-950/20',
    textClass: 'text-emerald-400',
    iconName: 'completed',
  },
  failed: {
    label: 'FAILED',
    badgeClass: 'bg-rose-950/70 text-rose-300 border-rose-500/50',
    dotClass: 'bg-rose-400',
    borderClass: 'border-rose-600/50',
    bgClass: 'bg-rose-950/20',
    textClass: 'text-rose-400',
    iconName: 'failed',
  },
};

export const WORKER_STATUS_CONFIG: Record<WorkerStatus, StatusTokenConfig> = {
  idle: {
    label: 'IDLE',
    badgeClass: 'bg-zinc-900 text-zinc-400 border-zinc-700/60',
    dotClass: 'bg-zinc-400',
    borderClass: 'border-zinc-800',
    bgClass: 'bg-zinc-900/30',
    textClass: 'text-zinc-400',
    iconName: 'queued',
  },
  running: {
    label: 'RUNNING',
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    dotClass: 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    borderClass: 'border-emerald-600/40',
    bgClass: 'bg-emerald-950/20',
    textClass: 'text-emerald-400',
    iconName: 'running',
  },
  offline: {
    label: 'OFFLINE',
    badgeClass: 'bg-zinc-900/60 text-zinc-600 border-zinc-800',
    dotClass: 'bg-zinc-600',
    borderClass: 'border-zinc-800',
    bgClass: 'bg-zinc-900/10',
    textClass: 'text-zinc-600',
    iconName: 'failed',
  },
};

export interface PipelineStageDef {
  id: 'upload' | 'storage' | 'queue' | 'worker' | 'ffmpeg' | 'renditions';
  label: string;
  sublabel: string;
  description: string;
}

export const PIPELINE_STAGES: PipelineStageDef[] = [
  {
    id: 'upload',
    label: 'UPLOAD',
    sublabel: 'Browser / Ingest',
    description: 'Direct multipart stream to backend API ingest endpoint',
  },
  {
    id: 'storage',
    label: 'STORAGE',
    sublabel: 'Postgres & Temp Disk',
    description: 'Media record created in Postgres with unique ID; raw file stored on NVMe storage',
  },
  {
    id: 'queue',
    label: 'QUEUE',
    sublabel: 'Redis Streams',
    description: 'Jobs dispatched as stream events across dedicated consumer groups',
  },
  {
    id: 'worker',
    label: 'WORKER',
    sublabel: 'Distributed Worker Node',
    description: 'Go background worker claims message via XREADGROUP and spawns isolated processing task',
  },
  {
    id: 'ffmpeg',
    label: 'FFMPEG',
    sublabel: 'Transcoding Engine',
    description: 'Hardware-accelerated transcode, scaling, keyframe alignment and poster extraction',
  },
  {
    id: 'renditions',
    label: 'RENDITIONS',
    sublabel: 'Cloudinary / CDN',
    description: 'Multi-resolution assets, poster image, and animated previews published with signed URLs',
  },
];

export const JOB_TYPE_CONFIG: Record<
  JobType,
  { label: string; shortLabel: string; resolution?: string; description: string }
> = {
  thumbnail: {
    label: 'Thumbnail Extraction',
    shortLabel: 'Thumbnail',
    resolution: '1280x720 (0.1s poster)',
    description: 'High-res poster image captured at 1s timestamp',
  },
  preview: {
    label: 'Animated Preview',
    shortLabel: 'Preview',
    resolution: '480x270 (3s loop)',
    description: 'Lightweight animated preview loop for hover previews',
  },
  '360p': {
    label: '360p Transcode',
    shortLabel: '360p',
    resolution: '640x360 @ 600 kbps',
    description: 'Standard definition rendition for low bandwidth streams',
  },
  '720p': {
    label: '720p HD Transcode',
    shortLabel: '720p',
    resolution: '1280x720 @ 2,400 kbps',
    description: 'High definition 720p rendition for mobile and standard screens',
  },
  '1080p': {
    label: '1080p Full HD Transcode',
    shortLabel: '1080p',
    resolution: '1920x1080 @ 4,800 kbps',
    description: 'Full HD 1080p master rendition with high-profile H.264',
  },
};
