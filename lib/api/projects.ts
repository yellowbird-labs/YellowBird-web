import { Project, CreateProjectInput } from '@/types/projects';
import { MOCK_PROJECTS } from '@/lib/demo/mock-data';
import { apiClient, isMockMode } from './client';

let inMemoryProjects: Project[] = [...MOCK_PROJECTS];

export async function getProjects(): Promise<Project[]> {
  if (isMockMode()) {
    return Promise.resolve([...inMemoryProjects]);
  }
  return apiClient<Project[]>('/api/v1/projects');
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (isMockMode()) {
    const found = inMemoryProjects.find((p) => p.id === id || p.slug === id);
    return Promise.resolve(found ? { ...found } : null);
  }
  return apiClient<Project>(`/api/v1/projects/${id}`);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  if (isMockMode()) {
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: input.name,
      slug,
      description: input.description || 'Custom media processing workspace',
      mediaCount: 0,
      processingCount: 0,
      completedCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryProjects = [newProject, ...inMemoryProjects];
    return Promise.resolve({ ...newProject });
  }
  return apiClient<Project>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
