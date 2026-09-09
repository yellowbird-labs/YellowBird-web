import { JobType } from './jobs';

export type WorkerStatus = 'idle' | 'running' | 'offline';

export interface WorkerInfo {
  id: string;
  name: string;
  hostname: string;
  status: WorkerStatus;
  currentJobId?: string;
  currentJobType?: JobType;
  currentMediaFilename?: string;
  currentProgressPercent?: number;
  cpuUsagePercent: number;
  memoryUsageMb: number;
  jobsCompletedToday: number;
  uptimeSeconds: number;
  lastHeartbeatAt: string;
}

export interface QueueMetrics {
  totalQueued: number;
  activeProcessing: number;
  totalCompleted24h: number;
  totalFailed24h: number;
  redisStreamLagMs: number;
  consumerGroupMembers: number;
  pendingAcks: number;
}
