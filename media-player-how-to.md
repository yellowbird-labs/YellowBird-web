# Media Player How-To (Dashboard Home)

Exact reproduction guide for the media player on the main home page — `app/(dashboard)/dashboard/page.tsx` (the effective home page; the root `/` route only redirects to `/login`).

---

## 1. What it is

The dashboard "media player" is a **framed YouTube embed panel**. Key facts:

- **No player library** — no howler, hls.js, wavesurfer, video.js, and no YouTube IFrame API SDK. It's a native `<iframe>` inside React.
- **No play/pause state inside the panel** — the player itself knows nothing about playback state. The only state is *which lecture URL to show*, and that lives in `localStorage`, read reactively with `useSyncExternalStore`.
- Play/pause is delegated to YouTube's own controls inside the iframe.

---

## 2. Architecture at a glance

```
app/(dashboard)/dashboard/page.tsx        (server component; lays out the grid)
  └─ VideoPlayerWrapper                   (client; localStorage-driven store)
       └─ YouTubeEmbedPanel               (client; the framed iframe player)
            ├─ panel-tokens.ts            (radius/padding/shadow constants)
            ├─ panel-primitives.tsx       (Screw decoration)
            └─ lib/ui-motion.ts           (SPRING_HOVER motion preset)
```

Producers of the state (written from the Library page):

```
components/library/library-client.tsx     ("watch on dashboard" button)
  └─ lib/youtube.ts                       (raw URL → embedUrl parser)
       └─ lib/dashboard-lecture.ts        (localStorage read/write/clear)
```

| Role | File |
|---|---|
| Home page (server component) | `app/(dashboard)/dashboard/page.tsx` |
| Client wrapper / store reader | `features/dashboard/components/video-player-wrapper.tsx` |
| The player itself | `features/dashboard/components/youtube-embed-panel.tsx` |
| Lecture state store | `lib/dashboard-lecture.ts` |
| YouTube URL parser | `lib/youtube.ts` |
| Producer (writes the state) | `components/library/library-client.tsx` → `selectForDashboard()` |
| Panel styling tokens | `features/dashboard/components/panel-tokens.ts` |
| Panel decoration | `features/dashboard/components/panel-primitives.tsx` |
| Motion presets | `lib/ui-motion.ts` |
| Unused HTML5 `<video>` player | `features/dashboard/components/video-player.tsx` (⚠️ not imported anywhere) |

---

## 3. Dependencies

- `next` (App Router), `react` 19, `typescript`, Tailwind v4
- `motion` ^12.36.0 — hover lift (`whileHover`) and `whileTap` on overlay buttons
- `lucide-react` — `Maximize2`, `Plus`, `X` icons

**No playback package** is installed or used (no howler, no YouTube API).

---

## 4. Home page mounts the panel

Full source of `app/(dashboard)/dashboard/page.tsx` (read verbatim from the repo):

```tsx
import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { getDashboardHomeData } from '@/lib/dashboard-home-data';
import VideoPlayerWrapper from '@/features/dashboard/components/video-player-wrapper';
import Leaderboard from '@/features/dashboard/components/leaderboard';
import TodoComponent from '@/features/dashboard/components/todo-component';
import DashboardHomeSkeleton from '@/components/loading/dashboard-home-skeleton';

async function DashboardHomeContent() {
  const session = await requireSession();
  const { tasks, boards } = await getDashboardHomeData(session.user.id);

  return (
    <div
      id="focus"
      tabIndex={-1}
      className="relative flex w-full max-w-[100vw] flex-col gap-4 overflow-x-hidden px-4 pb-4 pt-8 sm:gap-6 sm:px-5 sm:pb-5 sm:pt-10 md:h-full md:min-h-0 md:gap-8 md:overflow-y-auto md:px-6 md:pb-6 md:pt-12 lg:gap-10 scroll-mt-6 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_92%_72%_at_50%_40%,color-mix(in_oklch,var(--color-muted)_62%,transparent)_0%,transparent_70%)] before:content-['']"
    >
      <div className="relative z-10 grid min-w-0 grid-cols-1 gap-4 overflow-x-hidden sm:gap-6 md:min-h-0 md:flex-1 md:gap-7 xl:min-h-[min(34rem,calc(100dvh-17rem))] xl:grid-cols-[minmax(0,1.9fr)_minmax(0,3.1fr)] xl:gap-8">
        <Leaderboard boards={boards} currentUserId={session.user.id} />
        <VideoPlayerWrapper />
      </div>

      <div className="relative z-10 min-h-[10rem] shrink-0 xl:mt-2 xl:h-[20%] xl:min-h-[8.75rem] xl:flex-none xl:max-h-[34vh]">
        <TodoComponent
          initialTasks={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            type: task.type,
            deadline: task.deadline?.toISOString(),
            isCompleted: task.isCompleted,
          }))}
        />
      </div>
    </div>
  );
}

/** Suspense streams the shell immediately; Prisma work runs inside the boundary. */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardHomeSkeleton />}>
      <DashboardHomeContent />
    </Suspense>
  );
}
```

Key layout notes:
- The player sits in the right column (wider) of a 2-column grid on `xl`: `xl:grid-cols-[minmax(0,1.9fr)_minmax(0,3.1fr)]`.
- The panel is height-driven: parent grid rows use `md:min-h-0 md:flex-1`, so the player fills the available height instead of using a fixed aspect ratio.

---

## 5. State store — `lib/dashboard-lecture.ts`

The entire "which video is selected" state is a localStorage entry (`swm:dashboard-lecture`), wrapped in plain helpers that dispatch a custom `window` event so React can resubscribe. Full source:

```ts
export type DashboardLecture = {
  id: string;
  embedUrl: string;
  url: string;
  label: string;
};

export const DASHBOARD_LECTURE_STORAGE_KEY = "swm:dashboard-lecture";
export const DASHBOARD_LECTURE_CHANGED_EVENT = "dashboard-lecture-changed";

export function readDashboardLecture(): DashboardLecture | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DASHBOARD_LECTURE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DashboardLecture>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.id || !parsed.embedUrl || !parsed.url || !parsed.label) return null;
    return {
      id: String(parsed.id),
      embedUrl: String(parsed.embedUrl),
      url: String(parsed.url),
      label: String(parsed.label),
    };
  } catch {
    return null;
  }
}

export function writeDashboardLecture(value: DashboardLecture) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DASHBOARD_LECTURE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(DASHBOARD_LECTURE_CHANGED_EVENT));
}

export function clearDashboardLecture() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DASHBOARD_LECTURE_STORAGE_KEY);
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(DASHBOARD_LECTURE_CHANGED_EVENT));
}

// — LocalStorage helpers for explicitly selected dashboard lecture state.
```

---

## 6. The client wrapper — `VideoPlayerWrapper`

Full source of `features/dashboard/components/video-player-wrapper.tsx`:

```tsx
'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import YouTubeEmbedPanel from './youtube-embed-panel';
import {
  DASHBOARD_LECTURE_CHANGED_EVENT,
  DASHBOARD_LECTURE_STORAGE_KEY,
  clearDashboardLecture,
  readDashboardLecture,
  type DashboardLecture,
} from '@/lib/dashboard-lecture';

function subscribe(onStoreChange: () => void) {
  window.addEventListener(DASHBOARD_LECTURE_CHANGED_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(DASHBOARD_LECTURE_CHANGED_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

// getSnapshot must return a stable reference for identical storage contents,
// so cache the parsed value keyed on the raw localStorage string.
let cachedRaw: string | null | undefined;
let cachedValue: DashboardLecture | null = null;

function getSnapshot(): DashboardLecture | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(DASHBOARD_LECTURE_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = readDashboardLecture();
  }
  return cachedValue;
}

function getServerSnapshot(): DashboardLecture | null {
  return null;
}

export default function VideoPlayerWrapper() {
  const router = useRouter();
  const selection = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const embedUrl = selection?.embedUrl ?? null;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <YouTubeEmbedPanel
        embedUrl={embedUrl}
        activeLabel={selection?.label ?? null}
        onWatchLecture={() => router.push('/library')}
        onClearLecture={() => {
          clearDashboardLecture();
        }}
        onEnterFocus={embedUrl ? () => router.push('/rooms') : undefined}
        focusMode={false}
      />
    </div>
  );
}
```

Why `useSyncExternalStore` + caching: `getSnapshot` must return a **stable reference** for identical storage content or React complains/loops. The trick is to cache the parsed object keyed on the raw localStorage string, only re-parsing when the raw string differs. `getServerSnapshot` returns `null` so SSR never differs from hydration.

---

## 7. The player itself — `YouTubeEmbedPanel`

Full source of `features/dashboard/components/youtube-embed-panel.tsx`:

```tsx
'use client';

import { m } from 'motion/react';
import { Maximize2, Plus, X } from 'lucide-react';
import { Screw } from './panel-primitives';
import {
  PANEL_SHADOW,
  OUTER_RADIUS,
  GAP,
  INNER_RADIUS,
  SCREW_SIZE,
  SCREW_INSET,
} from './panel-tokens';
import { SPRING_HOVER } from '@/lib/ui-motion';

const EMPTY_TOOLTIP = 'start watching a youtube video';

type Props = {
  embedUrl: string | null;
  /** Library: fixed 16:9; dashboard: fills parent height. */
  large?: boolean;
  /** Shown when `large` and no URL (one line, no icon). */
  emptyHint?: string | null;
  onWatchLecture?: () => void;
  onClearLecture?: () => void;
  activeLabel?: string | null;
  /** Dashboard only: expands into fullscreen shell (iframe does not remount). */
  onEnterFocus?: () => void;
  focusMode?: boolean;
};

export default function YouTubeEmbedPanel({
  embedUrl,
  large = false,
  emptyHint = null,
  onWatchLecture,
  onClearLecture,
  activeLabel,
  onEnterFocus,
  focusMode = false,
}: Props) {
  const screwInset = SCREW_INSET;
  const isLibraryLayout = large;
  const showDashboardLectureEmpty = !isLibraryLayout && !!onWatchLecture;

  return (
    <div
      className={
        isLibraryLayout
          ? 'flex w-full min-w-0 flex-col items-stretch'
          : 'flex h-full w-full min-h-0 min-w-0 max-w-[100vw] items-stretch justify-center pl-0 pr-0 pt-1.5 pb-3 sm:pl-2 sm:pr-1 sm:pt-2 sm:pb-4 lg:justify-end lg:pr-0.5'
      }
    >
      <m.div
        className={
          'relative flex w-full flex-col border border-black/[0.035] bg-[color:var(--panel-texture-bg)] ring-1 ring-inset ring-black/[0.035] ' +
          (isLibraryLayout
            ? 'min-w-0 shrink-0'
            : 'h-full min-h-0 min-w-0 max-h-full w-full shrink-0 sm:max-w-[min(100%,94vw)] lg:w-[min(100%,90%)]')
        }
        style={{
          borderRadius: `${OUTER_RADIUS}px`,
          padding: `${GAP}px`,
          boxShadow: PANEL_SHADOW,
        }}
        whileHover={
          isLibraryLayout ? undefined : { y: -1, rotate: 0.06, scale: 1.002 }
        }
        transition={SPRING_HOVER}
      >
        <Screw
          className="absolute"
          style={{
            top: screwInset,
            left: screwInset,
            width: SCREW_SIZE,
            height: SCREW_SIZE,
          }}
        />
        <Screw
          className="absolute"
          style={{
            top: screwInset,
            right: screwInset,
            width: SCREW_SIZE,
            height: SCREW_SIZE,
          }}
        />

        <div
          className={
            isLibraryLayout
              ? 'relative aspect-video w-full overflow-hidden bg-neutral-950'
              : 'relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-neutral-950'
          }
          style={{ borderRadius: `${INNER_RADIUS}px` }}
        >
          {embedUrl && onClearLecture && !focusMode && (
            <m.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onClearLecture}
              className="absolute right-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-white/18 bg-black/45 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
              aria-label="Clear lecture"
            >
              <X size={15} strokeWidth={1.9} />
            </m.button>
          )}
          {embedUrl && onEnterFocus && !focusMode && (
            <m.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onEnterFocus}
              className="absolute left-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-white/18 bg-black/45 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
              aria-label="Focus mode — full screen lecture"
              title="Focus mode — full screen lecture"
            >
              <Maximize2 size={15} strokeWidth={1.9} />
            </m.button>
          )}
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title="YouTube player"
              className={
                isLibraryLayout
                  ? 'absolute inset-0 h-full w-full'
                  : 'h-full w-full'
              }
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : showDashboardLectureEmpty ? (
            <div className="flex h-full w-full flex-1 items-center justify-center">
              <button
                type="button"
                onClick={onWatchLecture}
                title={EMPTY_TOOLTIP}
                aria-label={EMPTY_TOOLTIP}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/22 text-white/88 transition-colors hover:border-white/45 hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          ) : emptyHint ? (
            <p className="max-w-[20rem] px-4 text-center text-xs leading-snug text-white/55 text-balance antialiased">
              {emptyHint}
            </p>
          ) : null}
          {embedUrl && activeLabel && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 pb-2.5 pt-8 text-center">
              <p className="truncate text-[10.5px] text-white/85">
                {activeLabel}
              </p>
            </div>
          )}
        </div>
      </m.div>
    </div>
  );
}
```

How it works:
1. **Outer height-driven panel** (`large=false` on the dashboard): the panel fills its grid cell (`h-full min-h-0`); the inner screen area is `flex-1` with `overflow-hidden`, so the iframe always fills whatever height the grid grants it. With `large=true` (library usage) it snaps to `aspect-video` 16:9 instead.
2. **Floating overlay buttons** — clear (X, top-right) and focus (Maximize2, top-left) — rendered absolutely over the iframe, only when a `embedUrl` exists and `focusMode` is false. They use `whileTap={{ scale: 0.96 }}`.
3. **Empty state** — a centered round `+` button that navigates to `/library` (`onWatchLecture`).
4. **Active lecture label** — a gradient scrim at the bottom showing the current lecture title (`activeLabel`).
5. The `embedUrl` is the **iframe-ready URL** (`https://www.youtube.com/embed/<id>?rel=0&modestbranding=1`), never a raw watch URL — conversion happens in `lib/youtube.ts` before the URL ever reaches the panel.

---

## 8. Panel styling tokens — `panel-tokens.ts`

Full source:

```ts
// Shared panel/card layout tokens for dashboard styling (constants only, no JSX).

export const PANEL_SHADOW = [
  '0 1px 3px rgba(22,25,37,0.036)',
  '0 14px 40px rgba(112,82,62,0.056)',
  'inset 0 1px 0 rgba(255,255,255,0.34)',
].join(',');

export const OUTER_RADIUS = 22;
export const GAP = 14;
export const INNER_RADIUS = OUTER_RADIUS - GAP;
export const SCREW_SIZE = 12;

const midArcRadius = OUTER_RADIUS - GAP / 2;
const corner45Inset = OUTER_RADIUS - midArcRadius / Math.SQRT2;
export const SCREW_INSET = corner45Inset - SCREW_SIZE / 2;
```

Notes:
- The panel uses a **nested-radius** system: `INNER_RADIUS = OUTER_RADIUS - GAP` keeps concentric corners visually perfect.
- `SCREW_INSET` is computed geometrically so screws hug the rounded corner's 45° arc.
- Background texture comes from CSS vars `--panel-texture-bg` (the component also references `--panel-texture-image` in the unused variant).

---

## 9. Screw decoration — `PanelPrimitives`

Full source of `features/dashboard/components/panel-primitives.tsx`:

```tsx
import type { CSSProperties } from 'react';

const slotStyle = (rotate: number): CSSProperties => ({
  position: 'absolute',
  width: '48%',
  height: '1.5px',
  borderRadius: '1px',
  top: '50%',
  left: '50%',
  transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
  background:
    'linear-gradient(90deg, transparent 0%, rgba(60,55,48,0.3) 20%, rgba(60,55,48,0.5) 50%, rgba(60,55,48,0.3) 80%, transparent 100%)',
});

export function Screw({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`z-10 ${className ?? ''}`} style={style}>
      <div
        className="w-full h-full rounded-full relative"
        style={{
          background:
            'radial-gradient(circle at 36% 30%, #e0dbd4 0%, #c4beb6 35%, #a8a29a 65%, #938d86 100%)',
          boxShadow: [
            '0 1.5px 5px rgba(17,24,39,0.16)',
            '0 0 0 0.5px rgba(0,0,0,0.1)',
            'inset 0 2px 1.5px rgba(255,255,255,0.3)',
            'inset 0 -1.5px 1.5px rgba(0,0,0,0.08)',
          ].join(','),
        }}
      >
        <div className="absolute inset-0">
          <div style={slotStyle(0)} />
          <div style={slotStyle(60)} />
          <div style={slotStyle(120)} />
        </div>

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(50,45,40,0.45) 0%, rgba(50,45,40,0.15) 100%)',
          }}
        />
      </div>
    </div>
  );
}

// — Shared panel/card primitives for dashboard styling.
```

Two `<Screw />` elements are absolutely positioned in the panel's top corners (top-left and top-right) at the geometric inset — a pure CSS visual detail of the "textured panel" design language.

---

## 10. Motion preset — `lib/ui-motion.ts`

Only `SPRING_HOVER` is used by the player:

```ts
/** Subtle lift on hover for textured panels */
export const SPRING_HOVER = {
  type: "spring" as const,
  stiffness: 380,
  damping: 32,
  mass: 0.58,
};
```

The hover effect on the dashboard variant: `whileHover={{ y: -1, rotate: 0.06, scale: 1.002 }}` — an almost imperceptible lift.

---

## 11. Producer side — how a lecture gets selected

From `components/library/library-client.tsx` (lines 138–147):

```tsx
function selectForDashboard(item: LibraryItemView) {
  if (!item.embedUrl) return;
  writeDashboardLecture({
    id: item.id,
    embedUrl: item.embedUrl,
    url: item.url,
    label: displayLabel(item),
  });
  router.push('/dashboard');
}
```

User flow: pick a lecture in `/library` → it writes `{ id, embedUrl, url, label }` to localStorage → navigate to `/dashboard` → `VideoPlayerWrapper` picks it up via `useSyncExternalStore` (both the custom event and the `storage` event are subscribed, so cross-tab changes update live too).

---

## 12. URL parsing — `lib/youtube.ts`

Full source (this is what turns any YouTube link into the `embedUrl`):

```ts
export type YouTubeMediaKind = "VIDEO" | "PLAYLIST";

export type ParsedYouTubeInput = {
  kind: YouTubeMediaKind;
  normalizedUrl: string;
  embedUrl: string;
  videoId: string | null;
  playlistId: string | null;
};

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const PLAYLIST_ID_RE = /^[a-zA-Z0-9_-]{10,}$/;

function ensureProtocol(raw: string) {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function canonicalHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (h.startsWith("www.")) return h.slice(4);
  return h;
}

function readVideoIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
    return parts[1] ?? null;
  }
  return null;
}

export function parseYouTubeInput(input: string): ParsedYouTubeInput | null {
  const raw = input.trim();
  if (!raw) return null;

  if (VIDEO_ID_RE.test(raw)) {
    return {
      kind: "VIDEO",
      normalizedUrl: `https://www.youtube.com/watch?v=${raw}`,
      embedUrl: `https://www.youtube.com/embed/${raw}?rel=0&modestbranding=1`,
      videoId: raw,
      playlistId: null,
    };
  }

  const withProtocol = ensureProtocol(raw);
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = canonicalHost(url.hostname);
  if (!["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host)) {
    return null;
  }

  const list = url.searchParams.get("list");
  if (list && PLAYLIST_ID_RE.test(list)) {
    return {
      kind: "PLAYLIST",
      normalizedUrl: `https://www.youtube.com/playlist?list=${list}`,
      embedUrl: `https://www.youtube.com/embed/videoseries?list=${list}&rel=0&modestbranding=1`,
      videoId: null,
      playlistId: list,
    };
  }

  let videoId: string | null = null;
  if (host === "youtu.be") {
    const segment = url.pathname.split("/").filter(Boolean)[0] ?? null;
    videoId = segment;
  } else {
    videoId = url.searchParams.get("v");
    if (!videoId) videoId = readVideoIdFromPath(url.pathname);
  }

  if (videoId && VIDEO_ID_RE.test(videoId)) {
    return {
      kind: "VIDEO",
      normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
      videoId,
      playlistId: null,
    };
  }

  return null;
}

// — Parse user-provided YouTube URLs into canonical watch/playlist + embed URLs.
```

Accepted inputs: raw 11-char video IDs, `watch?v=`, `youtu.be/<id>`, `/shorts/<id>`, `/live/<id>`, `/embed/<id>`, and playlist links (`?list=` → `videoseries` embed).

---

## 13. Reproduce from scratch — checklist

1. **Store** (`lib/dashboard-lecture.ts`): shape `{ id, embedUrl, url, label }`, key `swm:dashboard-lecture`, read/write/clear helpers each dispatching a `window` custom event.
2. **Wrapper** (`video-player-wrapper.tsx`): `'use client'`; `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` with the raw-string→parsed-object cache so the snapshot is referentially stable; `getServerSnapshot` returns `null`.
3. **Panel** (`youtube-embed-panel.tsx`): framed `m.div` (`outerRadius`/`GAP`/`PANEL_SHADOW`/two screws) containing an overflow-hidden inner screen with either an `<iframe src={embedUrl}>`, the `+` empty-state button, or the `emptyHint` text; optional overlay buttons and bottom label scrim.
4. **Tokens/primitives**: copy `panel-tokens.ts` and `Screw` (§8–9).
5. **Wire the page**: render `<VideoPlayerWrapper />` in a height-constrained grid cell (`md:min-h-0 md:flex-1` on the parents).
6. **Producers**: wherever the user picks media, call `writeDashboardLecture(...)` then navigate to the dashboard.
7. Convert user-supplied YouTube URLs with `parseYouTubeInput` before storing — the iframe must receive the `/embed/...` form with `rel=0&modestbranding=1`.

---

## 14. Notes and gotchas

- **`VideoPlayer` (`video-player.tsx`) is dead code** — an HTML5 `<video>` player with custom play/seek controls, gradient control bar, auto-hiding controls, drag-enabled frame. It's fully written but imported nowhere; `videoSrc` is hardcoded to `null`. It is *not* what renders on the home page.
- The panel is reused by the **Library page** with `large` (16:9 fixed) and `emptyHint` props.
- The `storage` event subscription means the dashboard player updates if the lecture is changed from another browser tab.
- iframe `allow` list covers autoplay, PiP, encrypted media; `referrerPolicy="strict-origin-when-cross-origin"`; `allowFullScreen`.
- The custom event name and storage key are string-literal contracts between producer (library) and consumer (dashboard) — keep them in sync.
- No SSR issue: `getServerSnapshot` returns `null`, so server render shows the empty state and hydrates to the stored lecture.
