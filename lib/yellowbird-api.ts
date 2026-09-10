import { getAuthToken, notifyAuthExpired, setSession, type AuthSession, type AuthUser } from '@/lib/auth/session';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'https://api.amaanworks.me';
export const API_BASE_URL = `${API_ORIGIN.replace(/\/$/, '')}/api/v1`;

export type MediaStatus = 'pending' | 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';
export interface Project { id: string; owner_id: string; name: string; description: string; created_at: string; updated_at: string; }
export interface Media { id: string; project_id: string; original_file_name: string; mime_type: string; size: number; status: MediaStatus; duration_seconds?: number; width?: number; height?: number; }
export interface Job { id: string; media_id: string; type: 'thumbnail' | 'preview' | 'transcode'; target_height?: 360 | 720 | 1080 | null; status: JobStatus; progress: number; error?: string; }
export interface Rendition { id: string; media_id: string; type: 'thumbnail' | 'preview' | 'transcode'; url: string; mime_type: string; size: number; width?: number; height?: number; duration_seconds?: number; }
export interface RegisterInput { name: string; email: string; password: string; }
export interface LoginInput { email: string; password: string; }
type ApiError = { error?: string };

function authHeaders(): HeadersInit { const token = getAuthToken(); return token ? { Authorization: `Bearer ${token}` } : {}; }
async function parseError(response: Response, protectedRequest: boolean) {
  let payload: ApiError = {};
  try { payload = await response.json() as ApiError; } catch { /* Empty error responses are valid. */ }
  if (response.status === 401 && protectedRequest) notifyAuthExpired();
  throw new Error(payload.error || `Request failed with HTTP ${response.status}`);
}
async function request<T>(path: string, init?: RequestInit, protectedRequest = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { Accept: 'application/json', ...(protectedRequest ? authHeaders() : {}), ...init?.headers } });
  if (!response.ok) await parseError(response, protectedRequest);
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export function registerUser(input: RegisterInput) { return request<AuthUser>('/users/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }, false); }
export async function loginUser(input: LoginInput) { const session = await request<AuthSession>('/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }, false); setSession(session); return session; }
export function getProjects() { return request<Project[]>('/projects'); }
export function createProject(input: { name: string; description?: string }) { return request<Project>('/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); }
export function getMedia(mediaId: string, signal?: AbortSignal) { return request<Media>(`/media/${mediaId}`, { signal }); }
export function getJobs(mediaId: string, signal?: AbortSignal) { return request<Job[]>(`/jobs?media_id=${encodeURIComponent(mediaId)}`, { signal }); }
export function getRenditions(mediaId: string, signal?: AbortSignal) { return request<Rendition[]>(`/renditions?media_id=${encodeURIComponent(mediaId)}`, { signal }); }

export function uploadMedia(projectId: string, file: File, onProgress?: (value: number) => void) {
  return new Promise<Media>((resolve, reject) => {
    const token = getAuthToken();
    if (!token) { reject(new Error('Sign in before uploading media.')); return; }
    const xhr = new XMLHttpRequest(); xhr.open('POST', `${API_BASE_URL}/media`); xhr.setRequestHeader('Authorization', `Bearer ${token}`); xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100)); };
    xhr.onerror = () => reject(new Error('Could not connect to the YellowBird API.'));
    xhr.onload = () => { let payload: Media & ApiError; try { payload = JSON.parse(xhr.responseText) as Media & ApiError; } catch { reject(new Error('The API returned an invalid response.')); return; } if (xhr.status === 401) notifyAuthExpired(); if (xhr.status < 200 || xhr.status >= 300) { reject(new Error(payload.error || `Upload failed with HTTP ${xhr.status}`)); return; } resolve(payload); };
    const formData = new FormData(); formData.append('project_id', projectId); formData.append('file', file); xhr.send(formData);
  });
}

export async function pollMediaUntilTerminal(mediaId: string, onUpdate: (media: Media, jobs: Job[], renditions: Rendition[]) => void, signal?: AbortSignal) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 180_000) {
    if (signal?.aborted) throw new DOMException('Polling cancelled', 'AbortError');
    const [media, jobs, renditions] = await Promise.all([getMedia(mediaId, signal), getJobs(mediaId, signal), getRenditions(mediaId, signal)]); onUpdate(media, jobs, renditions);
    if (media.status === 'ready') return { media, jobs, renditions };
    if (media.status === 'failed' || jobs.some((job) => job.status === 'failed')) throw new Error(jobs.find((job) => job.error)?.error || 'Media processing failed.');
    await new Promise((resolve, reject) => { const timeout = setTimeout(resolve, 2000); signal?.addEventListener('abort', () => { clearTimeout(timeout); reject(new DOMException('Polling cancelled', 'AbortError')); }, { once: true }); });
  }
  throw new Error('Media processing timed out after 180 seconds.');
}
