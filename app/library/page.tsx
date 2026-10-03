'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/auth/auth-gate';
import { NavBar } from '@/components/nav-bar';
import { ArrowUpRight, Film, Images, Play, Sparkles, Upload } from 'lucide-react';
import { getLibrarySnapshot, subscribeLibrary, writePreviewSelection, type LibraryItem, type LibraryRendition } from '@/lib/workspace-store';
import { useSyncExternalStore } from 'react';

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

export function LibraryWorkspace() {
  const router = useRouter();
  const items = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot, () => [] as LibraryItem[]);
  const [headingMediaId, setHeadingMediaId] = useState<string | null>(null);

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
    writePreviewSelection({
      mediaId: item.id,
      url: rendition.url,
      isVideo: rendition.mime_type.startsWith('video/'),
      label: rendition.label,
      fileName: item.fileName,
    });
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
        <div>
          <Link className="yb-ghost-button" href="/"><Upload className="size-3.5" aria-hidden /> New source</Link>
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
              </div>
              <div className="yb-feature-body">
                <h3>{feature.item.fileName}</h3>
                <p>Highest quality output from this source, {relativeTime(feature.item.uploadedAt)}. Pick any rung of the ladder — each one opens in the preview player.</p>
                <div className="yb-feature-actions">
                  {feature.ladder.map((rendition) => (
                    <button key={rendition.id} type="button" className="yb-ghost-button" onClick={() => watch(feature.item, rendition)}>{rendition.label}</button>
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
                    <button key={rendition.id} type="button" className="yb-media-card" onClick={() => watch(item, rendition)}>
                      <span className="yb-media-tile">
                        {item.renditions.find((thumb) => thumb.mime_type.startsWith('image/'))?.url ? <img src={item.renditions.find((thumb) => thumb.mime_type.startsWith('image/'))!.url} alt="" /> : null}
                        <span className="yb-tile-glyph"><Play className="size-4" fill="currentColor" aria-hidden /></span>
                        <span className="yb-tile-badge">{rendition.label}</span>
                        {formatDuration(rendition.duration_seconds) ? <span className="yb-tile-duration">{formatDuration(rendition.duration_seconds)}</span> : null}
                      </span>
                      <span className="yb-media-meta"><strong>{item.fileName}</strong><small>{rendition.detail}</small></span>
                    </button>
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
                    <button key={rendition.id} type="button" className="yb-media-card" onClick={() => watch(item, rendition)}>
                      <span className="yb-media-tile">
                        <img src={rendition.url} alt="" />
                        <span className="yb-tile-badge">{rendition.label}</span>
                      </span>
                      <span className="yb-media-meta"><strong>{item.fileName}</strong><small>{rendition.detail}</small></span>
                    </button>
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
        ) : (
          <div className="yb-section-empty" style={{ minHeight: 280 }}>
            <Sparkles className="size-5" aria-hidden />
            <strong>Your library is empty</strong>
            <span>Upload a source on the preview page and its renditions will collect here, ready to watch.</span>
            <Link className="yb-upload-primary" href="/"><Upload className="size-4" aria-hidden /> Upload media</Link>
          </div>
        )}
      </div>
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
