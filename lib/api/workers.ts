import { WorkerInfo, QueueMetrics } from '@/types/worker';
import { MOCK_WORKERS, MOCK_QUEUE_METRICS } from '@/lib/demo/mock-data';
import { apiClient, isMockMode } from './client';

export async function getWorkers(): Promise<WorkerInfo[]> {
  if (isMockMode()) {
    return Promise.resolve([...MOCK_WORKERS]);
  }
  return apiClient<WorkerInfo[]>('/api/v1/workers');
}

export async function getQueueMetrics(): Promise<QueueMetrics> {
  if (isMockMode()) {
    return Promise.resolve({ ...MOCK_QUEUE_METRICS });
  }
  return apiClient<QueueMetrics>('/api/v1/queue/metrics');
}
