import { Job, JobStatus, JobType } from '@/types/jobs';
import { getAllMockJobs } from '@/lib/demo/mock-data';
import { apiClient, isMockMode } from './client';

export interface JobsQueryFilter {
  status?: JobStatus;
  type?: JobType;
  mediaId?: string;
  projectId?: string;
  search?: string;
}

export async function getJobs(filter?: JobsQueryFilter): Promise<Job[]> {
  if (isMockMode()) {
    let jobs = getAllMockJobs();
    if (!filter) return Promise.resolve(jobs);

    if (filter.status) {
      jobs = jobs.filter((j) => j.status === filter.status);
    }
    if (filter.type) {
      jobs = jobs.filter((j) => j.type === filter.type);
    }
    if (filter.mediaId) {
      jobs = jobs.filter((j) => j.mediaId === filter.mediaId);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.id.toLowerCase().includes(q) ||
          j.input.filename.toLowerCase().includes(q) ||
          j.workerId?.toLowerCase().includes(q)
      );
    }
    return Promise.resolve(jobs);
  }

  return apiClient<Job[]>('/api/v1/jobs', {
    params: {
      status: filter?.status,
      type: filter?.type,
      mediaId: filter?.mediaId,
      search: filter?.search,
    },
  });
}

export async function getJobById(jobId: string): Promise<Job | null> {
  if (isMockMode()) {
    const jobs = getAllMockJobs();
    const found = jobs.find((j) => j.id === jobId);
    return Promise.resolve(found ? { ...found } : null);
  }
  return apiClient<Job>(`/api/v1/jobs/${jobId}`);
}
