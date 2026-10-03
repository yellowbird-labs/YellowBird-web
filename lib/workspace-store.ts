'use client';

import type { Rendition } from '@/lib/yellowbird-api';

export type LibraryRendition = Rendition & { label: string; detail: string };

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

const LIBRARY_KEY = 'yb:library-items';
const LIBRARY_EVENT = 'yb:library-changed';
const SELECTION_KEY = 'yb:preview-selection';
const SELECTION_EVENT = 'yb:preview-selection-changed';
const MAX_ITEMS = 12;

function isBrowser() { return typeof window !== 'undefined'; }

function emit(key: string, event: string) {
  window.dispatchEvent(new CustomEvent(event));
  void key;
}

export function readLibraryItems(): LibraryItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibraryItem[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && Array.isArray(item.renditions)) : [];
  } catch { return []; }
}

// useSyncExternalStore needs a stable snapshot for identical storage contents,
// so cache the parsed list keyed on the raw string.
let cachedLibraryRaw: string | null | undefined;
let cachedLibraryItems: LibraryItem[] = [];

export function getLibrarySnapshot(): LibraryItem[] {
  if (!isBrowser()) return [];
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(LIBRARY_KEY); } catch { raw = null; }
  if (raw !== cachedLibraryRaw) {
    cachedLibraryRaw = raw;
    cachedLibraryItems = readLibraryItems();
  }
  return cachedLibraryItems;
}

export function writeLibraryItems(items: LibraryItem[]) {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(items.slice(0, MAX_ITEMS))); } catch { /* quota — ignore */ }
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

export function clearLibrary() {
  if (!isBrowser()) return;
  try { window.localStorage.removeItem(LIBRARY_KEY); } catch { /* ignore */ }
  emit(LIBRARY_KEY, LIBRARY_EVENT);
}

export function subscribeLibrary(onStoreChange: () => void) {
  window.addEventListener(LIBRARY_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(LIBRARY_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

export function readPreviewSelection(): PreviewSelection | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SELECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PreviewSelection>;
    if (!parsed?.mediaId || !parsed?.url || !parsed?.fileName) return null;
    return { mediaId: parsed.mediaId, url: parsed.url, isVideo: Boolean(parsed.isVideo), label: parsed.label || '', fileName: parsed.fileName };
  } catch { return null; }
}

export function writePreviewSelection(selection: PreviewSelection) {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(SELECTION_KEY, JSON.stringify(selection)); } catch { /* ignore */ }
  emit(SELECTION_KEY, SELECTION_EVENT);
}

export function clearPreviewSelection() {
  if (!isBrowser()) return;
  try { window.localStorage.removeItem(SELECTION_KEY); } catch { /* ignore */ }
  emit(SELECTION_KEY, SELECTION_EVENT);
}

export function subscribePreviewSelection(onStoreChange: () => void) {
  window.addEventListener(SELECTION_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(SELECTION_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

// — localStorage bridge so Preview publishes work and Library reads it back.

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
  return { ...rendition, label: renditionLabel(rendition), detail: renditionDetail(rendition) };
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
