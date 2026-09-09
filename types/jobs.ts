export type JobType = 'thumbnail' | 'preview' | '360p' | '720p' | '1080p';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'retrying';

export interface JobEvent {
  id: string;
  stage: 'created' | 'queued' | 'claimed' | 'processing' | 'uploaded' | 'completed' | 'failed' | 'retried';
  label: string;
  timestamp: string;
  description?: string;
  workerId?: string;
}

export interface JobAttempt {
  attemptNumber: number;
  workerId: string;
  startedAt: string;
  finishedAt?: string;
  durationSeconds?: number;
  status: 'running' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface RenditionOutput {
  jobType: JobType;
  resolution?: string;
  bitrateKbps?: number;
  format: string;
  fileSizeBytes: number;
  url: string;
  durationSeconds?: number;
  codec?: string;
}

export interface JobInputSpec {
  filename: string;
  mediaId: string;
  sizeBytes: number;
  mimeType: string;
  sourceUrl?: string;
}

export interface Job {
  id: string;
  mediaId: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  progressPercent: number;
  attemptCount: number;
  maxAttempts: number;
  workerId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  errorMessage?: string;
  attempts: JobAttempt[];
  timeline: JobEvent[];
  output?: RenditionOutput;
  input: JobInputSpec;
}
