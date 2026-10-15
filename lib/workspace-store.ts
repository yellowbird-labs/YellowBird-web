'use client';

import {
  uploadMedia,
  pollMediaUntilTerminal,
  getRenditions,
  getProjects,
  listMedia,
  deleteRendition,
  type Job,
  type Media,
  type Rendition,
} from '@/lib/yellowbird-api';
import { hasAuthToken } from '@/lib/auth/session';
import { toast } from 'sonner';

export type LibraryRendition = Rendition & { label: string; detail: string; ready: boolean };

export type LibraryItem = {
  id: string; // media id
  fileName: string;
  kind: 'video' | 'image';
  uploadedAt: string;
  status: 'processing' | 'ready' | 'failed';
  renditions: LibraryRendition[];
};

export type PreviewSelection = {
  mediaId: string;
  url: string;
  isVideo: boolean;
  label: string;
  fileName: string;
};

export type WorkspaceSession = {
  mediaId: string | null;
  projectId: string;
  fileName: string;
  fileSize?: number;
  mimeType: string;
  kind: 'video' | 'image';
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'failed';
  uploadProgress: number;
  sourceUrl: string | null;
  selectedRenditionId: string | null;
  jobs: Job[];
  renditions: LibraryRendition[];
  error?: string | null;
};

const LIBRARY_KEY = 'yb:library-items';
const LIBRARY_EVENT = 'yb:library-changed';
const SELECTION_KEY = 'yb:preview-selection';
const SELECTION_EVENT = 'yb:preview-selection-changed';
const WORKSPACE_SESSION_KEY = 'yb:workspace-session';
const WORKSPACE_SESSION_EVENT = 'yb:workspace-session-changed';
const MAX_ITEMS = 12;

function isBrowser() {
  return typeof window !== 'undefined';
}

function emit(key: string, event: string) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(event));
  void key;
}

// ---------------------------------------------------------------------------
// In-memory module state (survives SPA navigation between / and /library)
// ---------------------------------------------------------------------------
let inMemorySession: WorkspaceSession | null = null;
let inMemoryFile: File | null = null;
let inMemoryObjectUrl: string | null = null;
let activePollController: AbortController | null = null;

export function getWorkspaceFile(): File | null {
  return inMemoryFile;
}

export function getWorkspaceObjectUrl(): string | null {
  return inMemoryObjectUrl;
}

// ---------------------------------------------------------------------------
// Library storage
// ---------------------------------------------------------------------------
export function readLibraryItems(): LibraryItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibraryItem[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && Array.isArray(item.renditions)) : [];
  } catch {
    return [];
  }
}

let cachedLibraryRaw: string | null | undefined;
let cachedLibraryItems: LibraryItem[] = [];

export function getLibrarySnapshot(): LibraryItem[] {
  if (!isBrowser()) return [];
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LIBRARY_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedLibraryRaw) {
    cachedLibraryRaw = raw;
    cachedLibraryItems = readLibraryItems();
  }
  return cachedLibraryItems;
}

export function writeLibraryItems(items: LibraryItem[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* quota — ignore */
  }
  emit(LIBRARY_KEY, LIBRARY_EVENT);
}

/** Insert-or-merge by media id, newest first. */
export function saveLibraryItem(item: LibraryItem) {
  const items = readLibraryItems().filter((existing) => existing.id !== item.id);
  writeLibraryItems([item, ...items]);
}

export function updateLibraryItem(mediaId: string, patch: Partial<Omit<LibraryItem, 'id'>>) {
  const items = readLibraryItems();
  const index = items.findIndex((item) => item.id === mediaId);
  if (index === -1) return;
  items[index] = { ...items[index], ...patch };
  writeLibraryItems(items);
}

export async function deleteLibraryRendition(renditionId: string, mediaId?: string): Promise<void> {
  const items = readLibraryItems();
  let targetMediaId = mediaId;

  // 1. Optimistically update local library items
  const updatedItems = items.map((item) => {
    const hasRendition = item.renditions.some((r) => r.id === renditionId);
    if (hasRendition) {
      targetMediaId = item.id;
      return {
        ...item,
        renditions: item.renditions.filter((r) => r.id !== renditionId),
      };
    }
    return item;
  });
  writeLibraryItems(updatedItems);

  // 2. Update workspace session if active session is using this rendition
  const currentSession = getWorkspaceSessionSnapshot();
  if (currentSession && (currentSession.selectedRenditionId === renditionId || currentSession.renditions.some((r) => r.id === renditionId))) {
    const remaining = currentSession.renditions.filter((r) => r.id !== renditionId);
    const newSelected = currentSession.selectedRenditionId === renditionId ? (remaining[0]?.id ?? null) : currentSession.selectedRenditionId;
    const newSourceUrl = currentSession.selectedRenditionId === renditionId ? (remaining[0]?.url ?? null) : currentSession.sourceUrl;
    updateWorkspaceSession({
      renditions: remaining,
      selectedRenditionId: newSelected,
      sourceUrl: newSourceUrl,
    });
  }

  // 3. Clear preview selection if it was pointing to this rendition
  const preview = readPreviewSelection();
  if (preview && (preview.mediaId === targetMediaId || preview.url.includes(renditionId))) {
    clearPreviewSelection();
  }

  // 4. Send API request
  try {
    await deleteRendition(renditionId);
    toast.success('Rendition deleted');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete rendition from server.';
    toast.error('Failed to delete rendition', { description: message });
    void syncLibraryFromApi();
    throw error;
  }
}

let isSyncingLibrary = false;

export async function syncLibraryFromApi(): Promise<LibraryItem[]> {
  if (!isBrowser() || !hasAuthToken()) return readLibraryItems();
  if (isSyncingLibrary) return readLibraryItems();
  isSyncingLibrary = true;

  try {
    const projects = await getProjects();
    if (!projects || projects.length === 0) return readLibraryItems();

    const mediaListByProject = await Promise.all(
      projects.map((p) => listMedia(p.id).catch(() => [] as Media[]))
    );
    const allMedia = mediaListByProject.flat();
    if (!allMedia || allMedia.length === 0) return readLibraryItems();

    const syncedItems: LibraryItem[] = await Promise.all(
      allMedia.map(async (m) => {
        let renditions: LibraryRendition[] = [];
        try {
          const apiRenditions = await getRenditions(m.id);
          renditions = apiRenditions.map(toLibraryRendition);
        } catch {
          // ignore error fetching renditions
        }
        const isVideo = m.mime_type ? m.mime_type.startsWith('video/') : true;
        const status: 'processing' | 'ready' | 'failed' =
          m.status === 'ready' ? 'ready' : m.status === 'failed' ? 'failed' : 'processing';

        return {
          id: m.id,
          fileName: m.original_file_name,
          kind: isVideo ? ('video' as const) : ('image' as const),
          uploadedAt: (m as { created_at?: string }).created_at || new Date().toISOString(),
          status,
          renditions,
        };
      })
    );

    syncedItems.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    // Keep any local items that are in-flight and not yet in the backend list
    const existing = readLibraryItems();
    const inFlight = existing.filter(
      (loc) => loc.status === 'processing' && !syncedItems.some((s) => s.id === loc.id)
    );

    const merged = [...inFlight, ...syncedItems];
    writeLibraryItems(merged);
    return merged;
  } catch (err) {
    console.error('Failed to sync library from API:', err);
    return readLibraryItems();
  } finally {
    isSyncingLibrary = false;
  }
}

export function clearLibrary() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(LIBRARY_KEY);
  } catch {
    /* ignore */
  }
  emit(LIBRARY_KEY, LIBRARY_EVENT);
}

export function subscribeLibrary(onStoreChange: () => void) {
  if (!isBrowser()) return () => {};
  window.addEventListener(LIBRARY_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(LIBRARY_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

// ---------------------------------------------------------------------------
// Preview selection (single clip handed off from library)
// ---------------------------------------------------------------------------
export function readPreviewSelection(): PreviewSelection | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SELECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PreviewSelection>;
    if (!parsed?.mediaId || !parsed?.url || !parsed?.fileName) return null;
    return {
      mediaId: parsed.mediaId,
      url: parsed.url,
      isVideo: Boolean(parsed.isVideo),
      label: parsed.label || '',
      fileName: parsed.fileName,
    };
  } catch {
    return null;
  }
}

export function writePreviewSelection(selection: PreviewSelection) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  } catch {
    /* ignore */
  }
  emit(SELECTION_KEY, SELECTION_EVENT);
}

export function clearPreviewSelection() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SELECTION_KEY);
  } catch {
    /* ignore */
  }
  emit(SELECTION_KEY, SELECTION_EVENT);
}

export function subscribePreviewSelection(onStoreChange: () => void) {
  if (!isBrowser()) return () => {};
  window.addEventListener(SELECTION_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(SELECTION_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

// ---------------------------------------------------------------------------
// Rendition labels
// ---------------------------------------------------------------------------
export function renditionLabel(rendition: Rendition) {
  if (rendition.type === 'transcode' && rendition.height) return `${rendition.height}p`;
  if (rendition.type === 'thumbnail') return 'Poster';
  return 'Preview';
}

export function renditionDetail(rendition: Rendition) {
  if (rendition.type === 'transcode' && rendition.height) {
    if (rendition.height === 1080) return 'Full HD';
    if (rendition.height === 720) return 'HD';
    return 'SD';
  }
  if (rendition.type === 'thumbnail') return 'Thumbnail';
  return '10 sec';
}

export function toLibraryRendition(rendition: Rendition): LibraryRendition {
  return { ...rendition, label: renditionLabel(rendition), detail: renditionDetail(rendition), ready: true };
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ---------------------------------------------------------------------------
// Persistent Workspace Session
// ---------------------------------------------------------------------------
function persistSession(session: WorkspaceSession | null) {
  if (!isBrowser()) return;
  if (!session || session.status === 'idle') {
    try {
      window.localStorage.removeItem(WORKSPACE_SESSION_KEY);
    } catch {
      /* ignore */
    }
  } else {
    try {
      const serializable: WorkspaceSession = {
        ...session,
        sourceUrl: session.sourceUrl?.startsWith('blob:') ? null : session.sourceUrl,
      };
      window.localStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(serializable));
    } catch {
      /* ignore */
    }
  }
  emit(WORKSPACE_SESSION_KEY, WORKSPACE_SESSION_EVENT);
}

export function readWorkspaceSession(): WorkspaceSession | null {
  if (inMemorySession) return inMemorySession;
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceSession;
    if (!parsed || !parsed.status || parsed.status === 'idle') return null;
    inMemorySession = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function getWorkspaceSessionSnapshot(): WorkspaceSession | null {
  if (inMemorySession) return inMemorySession;
  return readWorkspaceSession();
}

export function setWorkspaceSession(session: WorkspaceSession | null) {
  inMemorySession = session;
  persistSession(session);
}

export function updateWorkspaceSession(patch: Partial<WorkspaceSession>) {
  const current = getWorkspaceSessionSnapshot() || {
    mediaId: null,
    projectId: '',
    fileName: 'Source',
    mimeType: 'video/mp4',
    kind: 'video' as const,
    status: 'idle' as const,
    uploadProgress: 0,
    sourceUrl: null,
    selectedRenditionId: null,
    jobs: [],
    renditions: [],
    error: null,
  };
  inMemorySession = { ...current, ...patch };
  persistSession(inMemorySession);
}

export function subscribeWorkspaceSession(onStoreChange: () => void) {
  if (!isBrowser()) return () => {};
  window.addEventListener(WORKSPACE_SESSION_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(WORKSPACE_SESSION_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

export function cancelWorkspacePolling() {
  if (activePollController) {
    activePollController.abort();
    activePollController = null;
  }
}

export function clearWorkspaceSession() {
  cancelWorkspacePolling();
  if (inMemoryObjectUrl) {
    URL.revokeObjectURL(inMemoryObjectUrl);
    inMemoryObjectUrl = null;
  }
  inMemoryFile = null;
  clearPreviewSelection();
  inMemorySession = null;
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(WORKSPACE_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
  emit(WORKSPACE_SESSION_KEY, WORKSPACE_SESSION_EVENT);
}

export function selectWorkspaceRendition(renditionId: string | null) {
  updateWorkspaceSession({ selectedRenditionId: renditionId });
}

export function pollWorkspaceMedia(mediaId: string) {
  cancelWorkspacePolling();
  const controller = new AbortController();
  activePollController = controller;

  pollMediaUntilTerminal(
    mediaId,
    (nextMedia, nextJobs, nextRenditions) => {
      const mapped = nextRenditions.map(toLibraryRendition);
      const status = nextMedia.status === 'ready' ? 'ready' : nextMedia.status === 'failed' ? 'failed' : 'processing';

      updateLibraryItem(mediaId, {
        status,
        renditions: mapped,
      });

      updateWorkspaceSession({
        mediaId,
        jobs: nextJobs,
        renditions: mapped,
        status,
      });
    },
    controller.signal
  )
    .then((result) => {
      const mapped = result.renditions.map(toLibraryRendition);
      updateLibraryItem(mediaId, { status: 'ready', renditions: mapped });
      updateWorkspaceSession({
        mediaId,
        jobs: result.jobs,
        renditions: mapped,
        status: 'ready',
      });
      activePollController = null;
      toast.success('Renditions ready', { description: `${result.renditions.length} outputs are waiting in the library.` });
    })
    .catch((err) => {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Processing failed';
      const session = getWorkspaceSessionSnapshot();
      const hasRenditions = session && session.renditions && session.renditions.length > 0;
      if (!hasRenditions) {
        updateLibraryItem(mediaId, { status: 'failed' });
        updateWorkspaceSession({ status: 'failed', error: message });
      }
      activePollController = null;
      toast.error('Processing status', { description: message });
    });
}

export async function startWorkspaceUpload(
  projectId: string,
  incoming: File,
  onError?: (message: string) => void
) {
  cancelWorkspacePolling();

  if (inMemoryObjectUrl) {
    URL.revokeObjectURL(inMemoryObjectUrl);
    inMemoryObjectUrl = null;
  }

  const isVideo = incoming.type ? incoming.type.startsWith('video/') : !incoming.name.match(/\.(jpe?g|png|webp|gif|svg)$/i);
  const kind: 'video' | 'image' = isVideo ? 'video' : 'image';
  const objectUrl = URL.createObjectURL(incoming);
  inMemoryFile = incoming;
  inMemoryObjectUrl = objectUrl;

  const initialSession: WorkspaceSession = {
    mediaId: null,
    projectId,
    fileName: incoming.name,
    fileSize: incoming.size,
    mimeType: incoming.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    kind,
    status: 'uploading',
    uploadProgress: 0,
    sourceUrl: objectUrl,
    selectedRenditionId: null,
    jobs: [],
    renditions: [],
    error: null,
  };

  setWorkspaceSession(initialSession);

  try {
    const media = await uploadMedia(projectId, incoming, (progress) => {
      updateWorkspaceSession({ uploadProgress: progress });
    });

    updateWorkspaceSession({
      mediaId: media.id,
      status: 'processing',
      uploadProgress: 100,
    });

    saveLibraryItem({
      id: media.id,
      fileName: incoming.name,
      kind,
      uploadedAt: new Date().toISOString(),
      status: 'processing',
      renditions: [],
    });

    toast.success('Upload received', { description: 'The backend queued your rendition jobs.' });
    pollWorkspaceMedia(media.id);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    const message = err instanceof Error ? err.message : 'Upload failed';
    updateWorkspaceSession({ status: 'failed', error: message });
    onError?.(message);
    toast.error('Upload failed', { description: message });
  }
}

export function setWorkspaceFromLibrary(item: LibraryItem, rendition: LibraryRendition) {
  cancelWorkspacePolling();
  if (inMemoryObjectUrl) {
    URL.revokeObjectURL(inMemoryObjectUrl);
    inMemoryObjectUrl = null;
  }
  inMemoryFile = null;

  const isVideo = rendition.mime_type.startsWith('video/');
  const session: WorkspaceSession = {
    mediaId: item.id,
    projectId: '',
    fileName: item.fileName,
    mimeType: rendition.mime_type,
    kind: isVideo ? 'video' : 'image',
    status: item.status,
    uploadProgress: 100,
    sourceUrl: rendition.url,
    selectedRenditionId: rendition.id,
    jobs: [],
    renditions: item.renditions,
    error: null,
  };

  setWorkspaceSession(session);
  writePreviewSelection({
    mediaId: item.id,
    url: rendition.url,
    isVideo,
    label: rendition.label,
    fileName: item.fileName,
  });

  if (item.status === 'processing' && item.id) {
    pollWorkspaceMedia(item.id);
  }
}

export function resumeWorkspacePollingIfNeeded() {
  if (!isBrowser()) return;
  const session = getWorkspaceSessionSnapshot();
  if (session && session.mediaId && session.status === 'processing') {
    if (!activePollController) {
      pollWorkspaceMedia(session.mediaId);
    }
  } else if (session && session.mediaId && session.renditions.length === 0) {
    getRenditions(session.mediaId)
      .then((items) => {
        const mapped = items.map(toLibraryRendition);
        updateWorkspaceSession({ renditions: mapped });
      })
      .catch(() => {});
  }
}
