import { Job, RenditionOutput } from './jobs';

export type ProcessingStatus = 'uploaded' | 'queued' | 'processing' | 'ready' | 'failed';

export interface MediaItem {
  id: string;
  projectId: string;
  projectName?: string;
  filename: string;
  originalSizeBytes: number;
  mimeType: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps?: number;
  codec?: string;
  status: ProcessingStatus;
  overallProgressPercent: number;
  uploadedAt: string;
  completedAt?: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  renditions: RenditionOutput[];
  jobs: Job[];
  errorSummary?: string;
}

export interface UploadMediaInput {
  projectId: string;
  file: File | { name: string; size: number; type: string };
}
