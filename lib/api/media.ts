import { MediaItem } from '@/types/media';
import { MOCK_MEDIA_ITEMS } from '@/lib/demo/mock-data';
import { apiClient, isMockMode } from './client';

let inMemoryMedia: MediaItem[] = [...MOCK_MEDIA_ITEMS];

export async function getMediaItems(projectId?: string): Promise<MediaItem[]> {
  if (isMockMode()) {
    if (projectId) {
      return Promise.resolve(inMemoryMedia.filter((m) => m.projectId === projectId));
    }
    return Promise.resolve([...inMemoryMedia]);
  }
  return apiClient<MediaItem[]>('/api/v1/media', {
    params: projectId ? { projectId } : undefined,
  });
}

export async function getMediaById(mediaId: string): Promise<MediaItem | null> {
  if (isMockMode()) {
    const found = inMemoryMedia.find((m) => m.id === mediaId);
    return Promise.resolve(found ? { ...found } : null);
  }
  return apiClient<MediaItem>(`/api/v1/media/${mediaId}`);
}

export async function uploadMockMedia(file: { name: string; size: number; type: string }, projectId: string): Promise<MediaItem> {
  const now = new Date().toISOString();
  const id = `media_${Date.now()}`;
  const newMedia: MediaItem = {
    id,
    projectId,
    filename: file.name,
    originalSizeBytes: file.size,
    mimeType: file.type || 'video/mp4',
    durationSeconds: 120,
    width: 1920,
    height: 1080,
    fps: 30,
    codec: 'h264 / aac',
    status: 'queued',
    overallProgressPercent: 0,
    uploadedAt: now,
    sourceUrl: 'https://res.cloudinary.com/yellowbird-demo/video/upload/v1/samples/uploaded.mp4',
    renditions: [],
    jobs: [
      {
        id: `job_${id}_thumb`,
        mediaId: id,
        projectId,
        type: 'thumbnail',
        status: 'queued',
        progressPercent: 0,
        attemptCount: 0,
        maxAttempts: 3,
        createdAt: now,
        attempts: [],
        timeline: [{ id: 't1', stage: 'created', label: 'Job created', timestamp: now }],
        input: { filename: file.name, mediaId: id, sizeBytes: file.size, mimeType: file.type || 'video/mp4' },
      },
      {
        id: `job_${id}_prev`,
        mediaId: id,
        projectId,
        type: 'preview',
        status: 'queued',
        progressPercent: 0,
        attemptCount: 0,
        maxAttempts: 3,
        createdAt: now,
        attempts: [],
        timeline: [{ id: 't2', stage: 'created', label: 'Job created', timestamp: now }],
        input: { filename: file.name, mediaId: id, sizeBytes: file.size, mimeType: file.type || 'video/mp4' },
      },
      {
        id: `job_${id}_360p`,
        mediaId: id,
        projectId,
        type: '360p',
        status: 'queued',
        progressPercent: 0,
        attemptCount: 0,
        maxAttempts: 3,
        createdAt: now,
        attempts: [],
        timeline: [{ id: 't3', stage: 'created', label: 'Job created', timestamp: now }],
        input: { filename: file.name, mediaId: id, sizeBytes: file.size, mimeType: file.type || 'video/mp4' },
      },
      {
        id: `job_${id}_720p`,
        mediaId: id,
        projectId,
        type: '720p',
        status: 'queued',
        progressPercent: 0,
        attemptCount: 0,
        maxAttempts: 3,
        createdAt: now,
        attempts: [],
        timeline: [{ id: 't4', stage: 'created', label: 'Job created', timestamp: now }],
        input: { filename: file.name, mediaId: id, sizeBytes: file.size, mimeType: file.type || 'video/mp4' },
      },
      {
        id: `job_${id}_1080p`,
        mediaId: id,
        projectId,
        type: '1080p',
        status: 'queued',
        progressPercent: 0,
        attemptCount: 0,
        maxAttempts: 3,
        createdAt: now,
        attempts: [],
        timeline: [{ id: 't5', stage: 'created', label: 'Job created', timestamp: now }],
        input: { filename: file.name, mediaId: id, sizeBytes: file.size, mimeType: file.type || 'video/mp4' },
      },
    ],
  };

  inMemoryMedia = [newMedia, ...inMemoryMedia];
  return Promise.resolve({ ...newMedia });
}
