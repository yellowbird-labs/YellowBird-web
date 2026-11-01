# Yellowbird

Web client for the Yellowbird media pipeline. Sign in, upload a video or image into a project, and review the renditions the API produces.

The app is a Next.js frontend. Processing, storage, and auth live on the API at `${NEXT_PUBLIC_API_URL}/api/v1`. If that variable is unset, the client uses `https://api.amaanworks.me`.

## Features

- Register and sign in against the API. The session is a JWT kept in `localStorage`.
- Create a project and upload one video or image into it. The upload reports progress.
- Poll media, jobs, and renditions until processing finishes or 15 minutes pass.
- Preview the source and each ready output. Switch renditions from the rail above the player.
- Browse every project’s media in the library, refresh it from the API, open a rendition in the preview, or delete a rendition.
- Light and dark theme. The choice is stored in `localStorage` and applied before paint.

## Requirements

- Node.js 20 or newer
- npm
- A Yellowbird API that implements the contract below

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Default | |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.amaanworks.me` | API origin, no trailing path. The client appends `/api/v1`. |

`.env*` files are gitignored. Only `.env.example` is committed.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`eslint-config-next`) |

## Routes

| Path | Auth | |
| --- | --- | --- |
| `/` | required | Preview workspace: project picker, upload, rendition rail, player |
| `/library` | required | Renditions across the signed-in user’s projects |
| `/login` | public | Email and password. `?next=` is honored when it starts with `/` |
| `/register` | public | Name (2–100), email, password (8–72) |

`AuthGate` sends unauthenticated visits to `/login`. A `401` on a protected request, or an expired JWT `exp` claim, clears the session and returns the user to login. Sign out does the same.

## API

All paths are under `/api/v1`. Protected calls send `Authorization: Bearer <token>`.

| Method | Path | Auth | Used for |
| --- | --- | --- | --- |
| `POST` | `/users/register` | no | Create an account. Body: `{ name, email, password }` |
| `POST` | `/users/login` | no | Returns `{ token, user }` |
| `GET` | `/projects` | yes | Projects for the current user |
| `POST` | `/projects` | yes | Body: `{ name, description? }` |
| `GET` | `/media?project_id=` | yes | Media in a project |
| `POST` | `/media` | yes | Multipart form: `project_id`, `file` |
| `GET` | `/media/:id` | yes | One media record |
| `GET` | `/jobs?media_id=` | yes | Thumbnail, preview, and transcode jobs |
| `GET` | `/renditions?media_id=` | yes | Output files |
| `DELETE` | `/renditions/:id` | yes | Remove one rendition |

Job types are `thumbnail`, `preview`, and `transcode`. Transcode targets are `360`, `720`, and `1080`. Media status values the UI treats as terminal are `ready` and `failed`. Anything else is still in progress.

The client polls those three reads together every 2.5 seconds, for at most 15 minutes. Displayed progress is the average of the current jobs’ `progress` fields. Polling stops early when the media is `ready`, when every job has failed, or when jobs have finished and at least one rendition exists. If the timeout hits and renditions already exist, those renditions are kept.

## Preview

Accepted files are `video/*` and `image/*`. Drop a file on the stage or use Upload media.

With one project, its name is shown. With more than one, a select chooses the upload target. With none, the workspace asks for a project name (max 255 characters) and creates it first.

The local file is previewed from a blob URL while the upload runs. After the API accepts the file, the client polls and fills the rendition rail as outputs appear. Labels:

| Rendition | Label |
| --- | --- |
| Transcode with a height | `360p`, `720p`, `1080p` (`SD`, `HD`, `Full HD`) |
| Thumbnail | Poster |
| Preview | Preview (`10 sec`) |

Clear drops the in-memory file and the saved workspace session. It does not delete media on the server.

The workspace session is written to `localStorage` (`yb:workspace-session`) so a reload can resume polling. Blob URLs are not stored. The `File` object itself only lives in memory, so a reload loses the local source preview until a rendition URL is available.

### Player

Video controls: play/pause, scrub (with buffer), volume, speed (`0.5×`, `1×`, `1.5×`, `2×`), fullscreen.

| Key | |
| --- | --- |
| `Space`, `K` | Play / pause |
| `J` / `L` | Seek −10s / +10s |
| `←` / `→` | Seek −5s / +5s |
| `↑` / `↓` | Volume ±10% |
| `M` | Mute |

Shortcuts are ignored while focus is in an input, and when Ctrl, Meta, or Alt is held.

Image controls: zoom from 50% to 300% in 25% steps, rotate by 90°, reset.

## Library

On mount, and when Sync is pressed, the client loads every project, then each project’s media and renditions. Items are sorted newest first. A local item still marked `processing` is kept if the API does not list it yet.

The page splits video and image renditions, and shows a resolution ladder for the newest ready video. Opening a rendition writes it into the workspace session and navigates to `/`. Deleting a rendition asks for confirmation, then calls `DELETE /renditions/:id`.

The library cache is `yb:library-items` in `localStorage`, capped at 12 items. The API sync is the source of truth when it succeeds.

## Theme

`yb:theme` in `localStorage` is `light` or `dark`. With no stored value, the client follows `prefers-color-scheme`. An inline script in the root layout sets `document.documentElement.dataset.theme` before React hydrates.

## Project layout

```
app/
  page.tsx              Preview workspace
  library/page.tsx      Library
  login/page.tsx
  register/page.tsx
  layout.tsx            Fonts, theme bootstrap, toasts
  globals.css
  robots.ts
components/
  nav-bar.tsx           Preview / Library, theme, account menu
  auth/auth-gate.tsx
  workspace/media-stage.tsx
lib/
  yellowbird-api.ts     API client
  auth/session.ts       JWT session
  workspace-store.ts    Upload, poll, library cache, workspace session
  theme.ts
```

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Sonner, Lucide, `@fontsource-variable` Inter and Archivo.
