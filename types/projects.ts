export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  mediaCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description: string;
}
