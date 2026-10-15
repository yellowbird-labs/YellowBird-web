'use client';

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/auth/auth-gate';
import { NavBar } from '@/components/nav-bar';
import { ArrowUpRight, Film, Images, LoaderCircle, Play, RefreshCw, Sparkles, Trash2, Upload, X } from 'lucide-react';
import {
  deleteLibraryRendition,
  getLibrarySnapshot,
  setWorkspaceFromLibrary,
  subscribeLibrary,
  syncLibraryFromApi,
  type LibraryItem,
  type LibraryRendition,
} from '@/lib/workspace-store';
import { toast } from 'sonner';

function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

function formatDuration(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  const whole = Math.round(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function heightOf(rendition: LibraryRendition) {
  return rendition.height ?? (rendition.type === 'preview' ? 1 : 0);
}

interface DeleteTarget {
  id: string;
  mediaId: string;
  label: string;
  detail: string;
  fileName: string;
}

export function LibraryWorkspace() {
  const router = useRouter();
  const items = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot, () => [] as LibraryItem[]);
  const [headingMediaId, setHeadingMediaId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(true);
  const [renditionToDelete, setRenditionToDelete] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    syncLibraryFromApi().finally(() => setSyncing(false));
  }, []);

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      await syncLibraryFromApi();
      toast.success('Library synced with server');
    } catch {
      toast.error('Could not sync library');
    } finally {
      setSyncing(false);
    }
  };

  const confirmDeleteRendition = async () => {
    if (!renditionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteLibraryRendition(renditionToDelete.id, renditionToDelete.mediaId);
      setRenditionToDelete(null);
    } catch {
      // toast already fired inside deleteLibraryRendition
    } finally {
      setIsDeleting(false);
    }
  };

  const videoRenditions = useMemo(() => {
    const pairs: Array<{ item: LibraryItem; rendition: LibraryRendition }> = [];
    for (const item of items) {
      for (const rendition of item.renditions) {
        if (rendition.mime_type.startsWith('video/')) pairs.push({ item, rendition });
      }
    }
    return pairs.sort((a, b) => heightOf(b.rendition) - heightOf(a.rendition));
  }, [items]);

  const imageRenditions = useMemo(() => {
    const pairs: Array<{ item: LibraryItem; rendition: LibraryRendition }> = [];
    for (const item of items) {
      for (const rendition of item.renditions) {
        if (rendition.mime_type.startsWith('image/')) pairs.push({ item, rendition });
      }
    }
    return pairs;
  }, [items]);

  // The most recent ready video item drives the "best suited" ladder.
  const feature = useMemo(() => {
    const candidates = items.filter((item) => item.status === 'ready' && item.renditions.some((rendition) => rendition.mime_type.startsWith('video/')));
    const item = candidates[0] ?? null;
    if (!item) return null;
    const videos = item.renditions.filter((rendition) => rendition.mime_type.startsWith('video/')).sort((a, b) => heightOf(b) - heightOf(a));
    return { item, best: videos[0], ladder: videos };
  }, [items]);

  const watch = (item: LibraryItem, rendition: LibraryRendition) => {
    setWorkspaceFromLibrary(item, rendition);
    router.push('/');
  };

  const activeHeadingId = headingMediaId ?? items[0]?.id ?? null;
  const headings = items.slice(0, 6);

  return (
    <main className="yb-shell">
      <NavBar />

      <header className="yb-lib-header">
        <div>
          <span className="yb-kicker">Library</span>
          <h1>Everything you have rendered</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="yb-ghost-button"
            onClick={handleRefresh}
            disabled={syncing}
            title="Sync library from server"
            aria-label="Sync library from server"
          >
            <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} aria-hidden />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <Link className="yb-ghost-button" href="/">
            <Upload className="size-3.5" aria-hidden /> New source
          </Link>
        </div>
      </header>

      <div className="yb-lib-main">
        {headings.length > 1 ? (
          <div className="yb-rendition-rail" role="tablist" aria-label="Sources">
            {headings.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={item.id === activeHeadingId}
                className={`yb-rendition-frame ${item.id === activeHeadingId ? 'is-selected' : ''}`}
                onClick={() => setHeadingMediaId(item.id)}
              >
                <span className="yb-frame-image"><Film className="size-3.5" aria-hidden /></span>
                <span className="yb-frame-label"><strong>{item.fileName}</strong><small>{relativeTime(item.uploadedAt)}</small></span>
              </button>
            ))}
          </div>
        ) : null}

        {feature && (headingMediaId === null || feature.item.id === headingMediaId) ? (
          <section aria-labelledby="best-suited">
            <div className="yb-section-head">
              <h2 id="best-suited">Best suited</h2>
              <span className="yb-kicker">Recommended ladder</span>
            </div>
            <div className="yb-feature" style={{ marginTop: 14 }}>
              <div className="yb-media-tile">
                {feature.item.renditions.find((rendition) => rendition.mime_type.startsWith('image/'))?.url ? (
                  <img src={feature.item.renditions.find((rendition) => rendition.mime_type.startsWith('image/'))!.url} alt="" />
                ) : null}
                <span className="yb-tile-glyph"><Play className="size-4" fill="currentColor" aria-hidden /></span>
                <span className="yb-tile-badge">{feature.best.label}</span>
                {formatDuration(feature.best.duration_seconds) ? <span className="yb-tile-duration">{formatDuration(feature.best.duration_seconds)}</span> : null}
                <button
                  type="button"
                  className="yb-tile-delete"
                  title={`Delete ${feature.best.label} rendition`}
                  aria-label={`Delete ${feature.best.label} rendition`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenditionToDelete({
                      id: feature.best.id,
                      mediaId: feature.item.id,
                      label: feature.best.label,
                      detail: feature.best.detail,
                      fileName: feature.item.fileName,
                    });
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
              <div className="yb-feature-body">
                <h3>{feature.item.fileName}</h3>
                <p>Highest quality output from this source, {relativeTime(feature.item.uploadedAt)}. Pick any rung of the ladder — each one opens in the preview player.</p>
                <div className="yb-feature-actions">
                  {feature.ladder.map((rendition) => (
                    <div key={rendition.id} className="yb-ladder-chip">
                      <button type="button" className="yb-ghost-button" onClick={() => watch(feature.item, rendition)}>
                        {rendition.label}
                      </button>
                      <button
                        type="button"
                        className="yb-ladder-delete"
                        title={`Delete ${rendition.label} rendition`}
                        aria-label={`Delete ${rendition.label} rendition`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenditionToDelete({
                            id: rendition.id,
                            mediaId: feature.item.id,
                            label: rendition.label,
                            detail: rendition.detail,
                            fileName: feature.item.fileName,
                          });
                        }}
                      >
                        <Trash2 className="size-3" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="yb-feature-actions">
                  <button type="button" className="yb-upload-primary" onClick={() => watch(feature.item, feature.best)}>
                    Watch in preview <ArrowUpRight className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {items.length ? (
          <>
            <section aria-labelledby="renditions-title">
              <div className="yb-section-head">
                <h2 id="renditions-title">Renditions</h2>
                <span className="yb-kicker">{videoRenditions.length} video {videoRenditions.length === 1 ? 'output' : 'outputs'}</span>
              </div>
              {videoRenditions.length ? (
                <div className="yb-card-grid" style={{ marginTop: 14 }}>
                  {videoRenditions.map(({ item, rendition }) => (
                    <div
                      key={rendition.id}
                      role="button"
                      tabIndex={0}
                      className="yb-media-card"
                      onClick={() => watch(item, rendition)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          watch(item, rendition);
                        }
                      }}
                    >
                      <span className="yb-media-tile">
                        {item.renditions.find((thumb) => thumb.mime_type.startsWith('image/'))?.url ? (
                          <img src={item.renditions.find((thumb) => thumb.mime_type.startsWith('image/'))!.url} alt="" />
                        ) : null}
                        <span className="yb-tile-glyph"><Play className="size-4" fill="currentColor" aria-hidden /></span>
                        <span className="yb-tile-badge">{rendition.label}</span>
                        {formatDuration(rendition.duration_seconds) ? <span className="yb-tile-duration">{formatDuration(rendition.duration_seconds)}</span> : null}
                        <button
                          type="button"
                          className="yb-tile-delete"
                          title={`Delete ${rendition.label} rendition`}
                          aria-label={`Delete ${rendition.label} rendition`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenditionToDelete({
                              id: rendition.id,
                              mediaId: item.id,
                              label: rendition.label,
                              detail: rendition.detail,
                              fileName: item.fileName,
                            });
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </span>
                      <span className="yb-media-meta">
                        <strong>{item.fileName}</strong>
                        <small>{rendition.detail}</small>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="yb-section-empty" style={{ marginTop: 14 }}>
                  <Film className="size-5" aria-hidden />
                  <strong>No video outputs yet</strong>
                  <span>Upload a source on the preview page — every transcode lands here.</span>
                </div>
              )}
            </section>

            <section aria-labelledby="thumbnails-title">
              <div className="yb-section-head">
                <h2 id="thumbnails-title">Thumbnails</h2>
                <span className="yb-kicker">{imageRenditions.length} stills</span>
              </div>
              {imageRenditions.length ? (
                <div className="yb-card-grid" style={{ marginTop: 14 }}>
                  {imageRenditions.map(({ item, rendition }) => (
                    <div
                      key={rendition.id}
                      role="button"
                      tabIndex={0}
                      className="yb-media-card"
                      onClick={() => watch(item, rendition)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          watch(item, rendition);
                        }
                      }}
                    >
                      <span className="yb-media-tile">
                        <img src={rendition.url} alt="" />
                        <span className="yb-tile-badge">{rendition.label}</span>
                        <button
                          type="button"
                          className="yb-tile-delete"
                          title={`Delete ${rendition.label} thumbnail`}
                          aria-label={`Delete ${rendition.label} thumbnail`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenditionToDelete({
                              id: rendition.id,
                              mediaId: item.id,
                              label: rendition.label,
                              detail: rendition.detail,
                              fileName: item.fileName,
                            });
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </span>
                      <span className="yb-media-meta">
                        <strong>{item.fileName}</strong>
                        <small>{rendition.detail}</small>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="yb-section-empty" style={{ marginTop: 14 }}>
                  <Images className="size-5" aria-hidden />
                  <strong>No stills yet</strong>
                  <span>Poster frames and thumbnails collect here once a source finishes processing.</span>
                </div>
              )}
            </section>
          </>
        ) : syncing ? (
          <div className="yb-section-empty" style={{ minHeight: 280 }}>
            <LoaderCircle className="size-6 animate-spin" aria-hidden />
            <strong>Syncing your library…</strong>
            <span>Retrieving generated renditions and media from server.</span>
          </div>
        ) : (
          <div className="yb-section-empty" style={{ minHeight: 280 }}>
            <Sparkles className="size-5" aria-hidden />
            <strong>Your library is empty</strong>
            <span>Upload a source on the preview page and its renditions will collect here, ready to watch.</span>
            <Link className="yb-upload-primary" href="/"><Upload className="size-4" aria-hidden /> Upload media</Link>
          </div>
        )}
      </div>

      {renditionToDelete ? (
        <div
          className="yb-project-dialog-layer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !isDeleting) setRenditionToDelete(null);
          }}
        >
          <div className="yb-project-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-rendition-title">
            <button
              type="button"
              className="yb-project-dialog-close"
              onClick={() => setRenditionToDelete(null)}
              disabled={isDeleting}
              aria-label="Close delete dialog"
            >
              <X className="size-4" />
            </button>
            <span className="yb-kicker" style={{ color: 'var(--danger)' }}>Delete output</span>
            <h2 id="delete-rendition-title">Delete {renditionToDelete.label} rendition?</h2>
            <p>
              This will permanently delete the {renditionToDelete.detail} output for &ldquo;{renditionToDelete.fileName}&rdquo; from storage and the database.
            </p>
            <div className="yb-project-dialog-actions">
              <button type="button" onClick={() => setRenditionToDelete(null)} disabled={isDeleting}>
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRendition}
                disabled={isDeleting}
                style={{
                  background: 'var(--danger)',
                  color: '#ffffff',
                  borderColor: 'var(--danger)',
                }}
              >
                {isDeleting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function LibraryPage() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <LibraryWorkspace />
      </Suspense>
    </AuthGate>
  );
}
