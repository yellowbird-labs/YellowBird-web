# Ren0va Design System — Handover Report

> **Purpose of this document:** This is a complete, self-contained brief for another agent (or developer) to re-implement the Ren0va visual design language in a *new* project. It explains the design philosophy, then documents exactly *how* colors, custom SVG icons, buttons, and typography are implemented — with copy-pasteable code.
>
> **Source of truth:** `src/styles/landing.css`, `src/pages/index.astro`, `scripts/process.ts`, `scripts/build.ts`, `src/generate.ts`. Everything below is extracted from the real production code, not guesses.

---

## 1. Design Philosophy

The design language can be summarized as **"paper & highlighter"** — a warm, tactile, utility-first aesthetic that feels like a printed worksheet someone marked up with a fluorescent highlighter.

### Core principles

1. **One loud accent, everything else monochrome.**
   The UI is built almost entirely in a single ink color (`#151312`) at varying opacities over warm paper whites. The *only* saturated color in the product chrome is an acid lime (`#c5f80a`). Because the accent is scarce, it reads as intentional — it appears only on the brand underline stroke, the preview frame tint, and the "selected" state in the dropdown.

2. **Tint with alpha, never with gray hex codes.**
   Muted text, borders, hover fills — all are the same ink color with an alpha channel instead of separate gray values. This guarantees every tint is harmonious with the background hue. (Detailed in §2.)

3. **Flat-but-physical.**
   Surfaces are flat white cards with 1px borders, but they *feel* dimensional through a signature layered box-shadow recipe (a crisp half-pixel edge + a 1px white hairline on top + two depths of soft ambient shadow). Interaction is tactile: hover lifts, press sinks (`translateY(1px) scale(0.99)` + inset shadow).

4. **Texture over decoration.**
   The page background is a dual-layer dot grid (one neutral dot layer + one blush-tinted dot layer at a larger, offset cell) that gives a subtle engineering-paper feel. There are no gradients, no glassmorphism, no illustrations.

5. **Utilitarian typography.**
   Small, dense type. A variable-weight sans (Inter) tuned with *fractional* weights (450 body, 550–560 for emphasis), and a mono (Geist Mono) for anything machine-generated. No display font, no oversized headings — the loudest typographic moment is a hand-drawn highlighter stroke under the wordmark.

6. **Zero framework, zero hydration.**
   Vanilla CSS only, tokens as CSS custom properties, inline `<style>` compiled into the page. Astro with zero JS islands. If you port this design, keep it dependency-free: no Tailwind, no CSS-in-JS, no UI library.

7. **Motion is functional and tiny.**
   Everything transitions in 160ms ease (180ms for shadows). There is exactly one entrance animation (the highlighter stroke drawing itself in 420ms), and it fully respects `prefers-reduced-motion`.

---

## 2. Colors — how they are implemented

### 2.1 Token layer (`:root`)

```css
:root {
  /* surfaces */
  --bg: #fbf7f8;            /* warm paper, NOT pure white — pinkish off-white */
  --surface: #ffffff;       /* card faces */
  --surface-2: #fbfaf7;     /* inset wells (preview frame interior) */

  /* ink — one hue, many alphas */
  --text: #151312;          /* near-black with warmth (not #000) */
  --muted: rgba(21, 19, 18, 0.66);
  --border: rgba(21, 19, 18, 0.16);   /* primary hairlines */
  --border-2: rgba(21, 19, 18, 0.1);  /* faint hairlines */

  /* the single accent */
  --accent: #c5f80a;                      /* acid lime */
  --accent-weak: rgba(197, 248, 10, 0.16);/* pre-mixed tint of the same lime */

  /* semantic */
  --danger: #c33b2e;        /* warm brick red, not #ff0000 */

  /* elevation */
  --shadow-1: 0 1px 0 rgba(0, 0, 0, 0.05), 0 10px 22px rgba(0, 0, 0, 0.12);
  --shadow-2: 0 1px 0 rgba(0, 0, 0, 0.06), 0 16px 42px rgba(0, 0, 0, 0.18);

  /* geometry & rhythm */
  --radius: 12px;
  --radius-sm: 10px;
  --space-1: 8px;  --space-2: 12px; --space-3: 16px;
  --space-4: 20px; --space-5: 28px; --space-6: 36px;
  --container: 1120px;
  --control-h: 46px;   /* every control is exactly 46px tall */
}
```

### 2.2 The alpha-ink technique (the most important color decision)

Almost every text color, placeholder, border, and hover fill in the codebase is `rgba(21, 19, 18, X)` — the ink token with an explicit alpha — rather than a distinct gray hex:

| Use | Value |
| :--- | :--- |
| Body text | `var(--text)` = `#151312` |
| Icon link resting color | `rgba(21, 19, 18, 0.68)` |
| URL input text | `rgba(21, 19, 18, 0.74)` |
| Muted paragraphs / status | `rgba(21, 19, 18, 0.56–0.66)` |
| Placeholder | `rgba(21, 19, 18, 0.42–0.46)` |
| Card / button borders | `rgba(21, 19, 18, 0.16)` |
| Faint borders (kbd, chips) | `rgba(21, 19, 18, 0.1)` |
| Row dividers (dropdown options) | `rgba(21, 19, 18, 0.08)` |
| Hover fill on rows/segments | `rgba(21, 19, 18, 0.05)` |
| Button hover borders | `rgba(21, 19, 18, 0.22–0.24)` |

**Why:** grays chosen by hand never perfectly match the ambient hue of a warm background. Alpha-blending one warm ink guarantees every level of emphasis belongs to the same family, and it survives if you later change `--bg`. **Port this exactly.**

### 2.3 Supporting accents (rare, semantic)

| Color | Where used |
| :--- | :--- |
| `#1a1b26` (dark navy) | tooltip background, white text |
| `rgba(64, 125, 255, 0.18)` | universal focus-visible ring (3px, `outline: none` + `box-shadow`) |
| `rgba(64, 125, 255, 0.4)` | text input focus border |
| `rgba(15, 159, 95, …)` | success states (green text `0.9` alpha, green button border `0.3` alpha) |
| `#c33b2e` (`--danger`) | error status text |

Note the focus ring is **faint blue at 18% alpha**, not a solid ring — soft enough to feel like a glow without shouting.

### 2.4 The textured background (paper + blush dots)

The signature background is two stacked radial-gradient dot grids:

```css
body {
  background-color: var(--bg); /* #fbf7f8 */
  background-image:
    radial-gradient(circle, rgba(0, 0, 0, 0.12) 1px, transparent 1px),      /* fine neutral dots */
    radial-gradient(circle, rgba(201, 157, 163, 0.34) 1px, transparent 1px); /* blush pink dots */
  background-size: 22px 22px, 88px 88px;      /* dense fine grid + sparse blush accents */
  background-position: 0 0, 18px 30px;        /* blush layer offset so patterns never align */
}
```

- Layer 1: 22px grid of faint black dots — the "graph paper."
- Layer 2: 88px grid of `rgba(201, 157, 163, 0.34)` (blush/blossom) dots, offset — sparse warm speckles that break the mechanical grid.
- The blush token (`#c99da3`) was defined as `--blossom` in the palette and only appears here — texture, never UI.

### 2.5 Icon-tile palette (for generated icon art, not UI)

The icon engine derives theme tiles from a two-palette map in `scripts/process.ts`:

```ts
const THEMES = {
  dark:  { bg: "#1e1e2e", fg: "#f8fafc" },  // Catppuccin-mocha-ish bg, near-white fg
  light: { bg: "#ffffff", fg: "#0f172a" },  // white bg, slate-900 fg
}
```

Dark-theme legibility is enforced at **build time**: any near-black *grayscale* paint (grayscale within ±14 channel spread and luminance < 96, per `scripts/build.ts`) is rewritten to `#f8fafc` so monochrome logos stay legible on the dark tile. Chromatic (brand-colored) fills are left untouched.

---

## 3. Custom SVG Icons

There are three distinct SVG systems. Don't conflate them:

1. **UI glyphs** — hand-drawn stroke icons for the header.
2. **The brand marking** — the animated highlighter swipe under the wordmark.
3. **The icon-content pipeline** — the 1210 normalized skill-icon tiles the product serves.

### 3.1 UI glyphs (header icons)

Style rules used consistently:

- `viewBox="0 0 24 24"`, rendered at 18px inside a 36px hit target (`.iconLink`).
- **Two icon styles:**
  - *Interface glyphs* (docs/bookmark): `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`, `stroke-linejoin="round"` / `stroke-linecap="round"` — a 1.8px stroke instead of the default 2px makes them feel lighter at 18px.
  - *Brand logos* (GitHub, X): solid `fill="currentColor"` with `opacity="0.92"` to visually match the weight of 1.8px strokes.
- Icons are **inline SVG in markup** (no icon font, no sprite, no external requests). Never hardcode black — always `currentColor` so hover color changes cascade.
- Accessibility: each link carries `aria-label`; decorative SVGs are `aria-hidden="true"`.
- Tooltips are CSS-only: `data-tooltip` attribute + `::after { content: attr(data-tooltip) }` that rises 4px with a 120ms fade. Tooltip styling: `#1a1b26` bg, white text, 11px/600, 6px radius.

The 36px icon-link button treatment (borderless until hover, scales to 0.98 on press, focus ring identical to other controls):

```css
.iconLink {
  width: 36px; height: 36px;
  display: grid; place-items: center;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: rgba(21, 19, 18, 0.68);
  transition: color 160ms ease, border-color 160ms ease,
              background-color 160ms ease, transform 160ms ease;
}
.iconLink:hover {
  color: var(--text);
  border-color: var(--border);
  background: rgba(255, 255, 255, 0.72);
}
.iconLink:active        { transform: scale(0.98); }
.iconLink:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(64, 125, 255, 0.18); }
```

### 3.2 The brand marking (highlighter underline) — signature element

Two hand-authored bezier paths sit *absolutely positioned behind the wordmark*, like a highlighter swiped under "ren0va." Full recipe:

**Markup** (inside a `position: relative` title row):

```html
<div class="brandTitleRow" aria-label="ren0va">
  <h1 class="brandTitle">ren0va</h1>
  <svg class="brandMarking" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true">
    <path class="markStroke markStroke1" d="M8 46 C 66 28, 132 54, 192 40 S 268 30, 312 36"
          fill="none" stroke="currentColor" stroke-width="10"
          stroke-linecap="round" stroke-linejoin="round" pathLength="1" />
    <path class="markStroke markStroke2" d="M12 54 C 74 36, 138 60, 204 46 S 276 38, 316 44"
          fill="none" stroke="currentColor" stroke-width="8"
          stroke-linecap="round" stroke-linejoin="round" pathLength="1" />
  </svg>
</div>
```

**CSS:**

```css
.brandTitle {
  position: relative; z-index: 1;   /* text ABOVE the stroke */
  font-size: 24px; line-height: 1.08;
  letter-spacing: -0.035em;
  font-variation-settings: "wght" 560;
}

.brandMarking {
  position: absolute; left: -6px; right: -6px; bottom: -18px;
  width: calc(100% + 12px); height: 42px;
  color: var(--accent);              /* the acid lime */
  transform: rotate(-3deg);           /* hand-applied tilt */
  mix-blend-mode: multiply;           /* ink-on-paper interaction with bg */
  filter: blur(0.25px) saturate(1.12);/* imperceptible softening + punch */
  pointer-events: none; z-index: 0;
}

.markStroke {
  stroke-dasharray: 1; stroke-dashoffset: 1;   /* fully hidden initially */
  opacity: 0.38;                                /* marker translucency */
  animation: mark-draw 420ms ease-out forwards;
}
.markStroke2 { opacity: 0.3; animation-delay: 70ms; }  /* staggered second pass */

@keyframes mark-draw { to { stroke-dashoffset: 0; } }
```

**Why it works (and what to replicate):**
- `pathLength="1"` normalizes both paths to length 1, so `stroke-dasharray: 1` → `stroke-dashoffset: 0` produces a perfect "draw" animation without measuring path lengths.
- Two strokes at different offsets make it look like a real double-pass of a marker, not a vector shape.
- `mix-blend-mode: multiply` makes the lime darken where it sits on the dotted background — this is what sells the "physical highlighter" idea.
- The `-3deg` rotation plus overflowing bounds (`left: -6px`) mimics a careless human swipe.
- Accessibility: `aria-hidden="true"`, and removed entirely under reduced motion (below).

**Reduced motion:**

```css
@media (prefers-reduced-motion: reduce) {
  .markStroke { animation: none !important; stroke-dashoffset: 0 !important; }
}
```

### 3.3 The icon-tile pipeline (product content)

If the target project serves icon art, replicate this normalization contract so every icon (from any source) renders identically:

**Tile contract (`scripts/process.ts`):**
- Output canvas: **48×48**.
- Background: full-canvas `<rect>` with `rx="6"` rounded corners in the theme bg color.
- Content box: the original artwork is scaled to fit **32×32** and centered inside an **8px padding** — i.e., art occupies the inner 32px of the 48px tile.

```ts
// fit inside 32x32 area of a 48x48 tile
const scale = 32 / Math.max(vbWidth, vbHeight)
const x = 8 + (32 - vbWidth * scale) / 2
const y = 8 + (32 - vbHeight * scale) / 2

// wrapped tile
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
  <rect width="48" height="48" rx="6" fill="${bg}"/>
  <g transform="translate(${x}, ${y}) scale(${scale})" fill="${fg}">
    <!-- original inner SVG markup, outer <svg> stripped -->
  </g>
</svg>
```

- File nomenclature: `{name}-{theme}.svg` (`react-dark.svg`, `react-light.svg`); themeless icons (bash, git, markdown, regex) have no suffix.
- Second build pass (`scripts/build.ts`) rewrites near-black grayscale fills/strokes in `-dark` variants to `#f8fafc` (parsed across hex / rgb()/rgba()/hsl()/named colors, plus `style=` declarations; `none|transparent|currentcolor|url()|var()` are ignored).

**Grid stitching (`src/generate.ts`):**
- Tiles assemble on a **48px tile + 6px gap** lattice: position of tile *i* is `(col * 54, row * 54)` where `col = i % perLine`.
- Each tile is wrapped `translate(x, y) → scale(TILE / iconWidth)` so heterogeneous source viewBoxes all land at the same visual size.
- Output: one `<svg>` with computed `width/height/viewBox` from `columns * 48 + (columns-1) * 6`.

**Resolution rules (runtime, `src/icons.ts` + `src/worker.ts`):**
1. Lowercase + trim the requested name.
2. Apply alias map (`ts→typescript`, `js→javascript`, `py→python`, `next→nextjs`, `tailwind→tailwindcss`, …).
3. Append `-{theme}` unless the icon is themeless.
4. Fuzzy fallback (Levenshtein, `src/fuzzy.ts`) corrects typos like `typscript`→`typescript` so users never get a broken image.
5. Theme fallback: request `{name}-{theme}` → if missing, try themeless `{name}` → then fuzzy; custom icons try `{path}-{theme}.svg` → `{path}.svg`.

---

## 4. Buttons — the "physical" recipe

All controls share: 13px text, weight ~560 (via `font-variation-settings`), `-0.01em` letter-spacing, 160ms ease transitions, `cursor: pointer`, `appearance: none`, and the blue focus-visible ring (`0 0 0 3px rgba(64,125,255,0.18)` with `outline: none`).

### 4.1 Primary button (the hero recipe)

The "look good" secret is a **single-element fake-bevel**: a vertical sheen gradient painted over a flat accent, plus a four-layer shadow stack that gives a crisp edge, a lit top edge, and two depths of shadow.

```css
.primaryBtn {
  appearance: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);          /* 12px */
  min-height: var(--control-h);          /* 46px */
  padding: 0 16px;
  font-size: 13px;
  font-variation-settings: "wght" 560;
  letter-spacing: -0.01em;
  cursor: pointer;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.2), rgba(0,0,0,0.06)),
    var(--accent);                       /* sheen over flat lime */
  color: rgba(10, 10, 10, 0.92);         /* near-black text on lime, not pure black */
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.22),     /* crisp half-pixel keyline */
    0 1px 0 rgba(255, 255, 255, 0.55),   /* 1px white top-light */
    0 2px 8px rgba(0, 0, 0, 0.12),       /* contact shadow */
    0 14px 28px rgba(0, 0, 0, 0.18);     /* large ambient shadow */
  transition:
    border-color 160ms ease, background-position 160ms ease,
    box-shadow 180ms ease, transform 160ms ease;
}

.primaryBtn:hover {
  border-color: rgba(21, 19, 18, 0.24);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.28), rgba(0,0,0,0.08)),  /* brighter sheen */
    var(--accent);
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.22),
    0 1px 0 rgba(255, 255, 255, 0.55),
    0 3px 10px rgba(0, 0, 0, 0.14),
    0 18px 36px rgba(0, 0, 0, 0.24);     /* shadows deepen = lifts toward you */
}

.primaryBtn:active {
  transform: translateY(1px) scale(0.99); /* the physical "press" */
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.22),
    0 1px 0 rgba(255, 255, 255, 0.35),   /* top-light dims */
    inset 0 2px 12px rgba(0, 0, 0, 0.12),/* INSET shadow = pressed surface */
    0 10px 20px rgba(0, 0, 0, 0.16);
}

.primaryBtn:disabled { opacity: 0.5; cursor: not-allowed; }

.primaryBtn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(64, 125, 255, 0.18),
    0 10px 22px rgba(21, 19, 18, 0.09);
}
```

**State narrative to preserve:** id = matte tile with light from above → hover = lifts (deepening shadow) → active = physically pushed down (translate + scale + inset shadow) → success = border turns green (`.btnOk { border-color: rgba(15, 159, 95, 0.3); }` on "Copied").

Key subtleties:
- The hover brightens the **gradient highlight** (0.2 → 0.28 white) before touching anything else — the perceived change is light, not color.
- `:active` doesn't just shrink; it adds an **inset** shadow so the face appears concave.
- Disabled state keeps the same shadow (only opacity drops), avoiding layout/visual pop.

### 4.2 The quiet family (ghost / secondary / segmented)

Flat, borderless-weight buttons that let the primary be the only loud object:

```css
.ghostBtn, .secondaryBtn {                /* Clear, Choose file */
  appearance: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);        /* 10px — smaller buttons, smaller radius */
  padding: 10px 12px;
  font-size: 13px;
  font-variation-settings: "wght" 560;
  background: #ffffff;
  color: rgba(21, 19, 18, 0.78);          /* ink at 78% instead of black */
  box-shadow: 0 1px 0 rgba(21, 19, 18, 0.04);  /* barely-there lip */
  transition: border-color 160ms ease, background-color 160ms ease;
}
.ghostBtn:hover, .secondaryBtn:hover { border-color: rgba(21, 19, 18, 0.22); }
```

### 4.3 Segmented control (theme toggle / stepper)

One white capsule containing flat buttons; the "selected" look is an inner ring + inner highlight, not a filled pill:

```css
.seg {
  border-radius: var(--radius);
  border: 1px solid var(--border-2);
  background: #ffffff;
  display: grid;
  overflow: hidden;              /* clips children to the capsule */
}
.segBtn {
  border: 0; background: transparent;
  color: rgba(21, 19, 18, 0.78);
  font-variation-settings: "wght" 550;
  padding: 12px 10px;
  transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.segBtn:hover   { background: rgba(21, 19, 18, 0.05); }
.segBtn.active  {
  font-variation-settings: "wght" 600;
  color: rgba(21, 19, 18, 0.9);
  background: rgba(21, 19, 18, 0.045);
  box-shadow: inset 0 0 0 1px rgba(21, 19, 18, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.65);  /* inner ring + inner top-light */
}
.segBtn:active  { transform: scale(0.99); }
```

**Rule of thumb:** high-emphasis = accent fill + fake bevel; low-emphasis = white fill + hairline; selection states are `inset` shadows, never saturated fills.

### 4.4 Chips (removable tags)

```css
.chip {
  border: 1px solid var(--border-2);
  background: #ffffff;
  border-radius: 999px;                    /* full pill */
  padding: 8px 10px;
  font-size: 12px;
  cursor: pointer;
  color: rgba(21, 19, 18, 0.76);
  display: inline-flex; align-items: center; gap: 8px;
  transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
}
.chip:hover  { border-color: rgba(21, 19, 18, 0.22); transform: translateY(-1px); } /* floats up */
.chip:active { transform: translateY(0) scale(0.98); }
```

Hover lifts `-1px` (rather than growing a shadow) — cheap, snappy, used across many small components. Plus `×` affordance in `.chipX` at 42% ink.

### 4.4 The micro-interaction grammar

Every interactive element follows one grammar — replicate it universally:

- **Timing:** `160ms ease` for colors/transform; `180ms ease` for box-shadows (shadows lag slightly for weight).
- **Press:** `scale(0.98–0.99)` and/or `translateY(1px)`.
- **Hover borders:** ink 0.16 resting → 0.22–0.24 hover (never a new color).
- **Focus:** identical ring everywhere — `box-shadow: 0 0 0 3px rgba(64,125,255,0.18)` + `outline: none`, via `:focus-visible` only (mouse clicks don't show rings).

---

## 5. Fonts & Typography

### 5.1 The stack

Two families only — a variable UI sans and a code mono, self-hosted via Fontsource (no Google Fonts request):

```css
@import "@fontsource-variable/inter/index.css";   /* Inter Variable, wght 100–900 */
@import "@fontsource/geist-mono/400.css";         /* Geist Mono (400 + 600 only) */
@import "@fontsource/geist-mono/600.css";
```

- Runtime packages: `@fontsource-variable/inter`, `@fontsource/geist-mono` (npm deps, not CDN).
- Astro emits per-script `unicode-range` subsets (`@font-face` blocks with `font-display: swap`) — subset woff2 files per latin/latin-ext/cyrillic/greek/vietnamese.
- Body stack: `"Inter Variable", Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"`.
- Mono instances use the **system mono stack** (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`) for URL input and kbd; Geist Mono is available as the styled mono face.
- ⚠️ The README's "Soria / Skyscrapers fonts" credit is stale — those fonts are not in the repo; the shipped stack is Inter Variable + Geist Mono.

### 5.2 Body rendering rules (render-quality details)

```css
body {
  font-optical-sizing: auto;
  font-variation-settings: "wght" 450;  /* body set at 450, not 400 — reads denser/sharper */
  letter-spacing: -0.01em;              /* global negative tracking */
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-synthesis: none;                 /* never fake-bold/fake-italic a variable font */
}
```

Small-but-important choices:
- **Weight 450 body**: Inter at 400 looks thin on light backgrounds at 13–14px; 450 is the readability sweet spot.
- **`font-synthesis: none`**: every visible weight must come from the real variable axis — no fake-bold smearing.
- **`letter-spacing: -0.01em` globally**, tightening further on headings.

### 5.3 Weight system via variable axis (not `font-weight`)

Weights are set through `font-variation-settings: "wght" N` at *fractional* values — a deliberate variable-font technique that gives finer granularity than the 400/500/600 steps:

| Element | Size | Weight (`wght`) | Tracking | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Brand title `h1` | 24px | 560 | `-0.035em` | `line-height: 1.08` — tightest on the page |
| Section titles | 15px | 560 | `-0.02em` | `line-height: 1.2` |
| Section micro-labels (PREVIEW…) | 12px | 550 | `+0.08em` | **uppercase** — the eyebrow pattern |
| Setting labels | 13px | 520 | — | |
| Body / inputs / buttons | 13–14px | 450 (body) / 550–560 (controls) | `-0.01em` | |
| Hints, statuses, footer | 13px | 450 (inherited) | — | |
| Dropdown option names | 13px | — | — | mono + `tabular-nums` |
| Tooltips | 11px | 600 | — | on dark `#1a1b26` |

Typographic hierarchy is therefore **weight-driven, not size-driven**: the section-label → section-title pair (12px uppercase 550 → 15px 560 with tighter tracking) creates its whole hierarchy in ~3px of size difference.

### 5.4 Type conventions worth porting

- **Mono for anything machine-typed**: URLs, icon identifiers, keyboard hints (`.kbd`, `.kbdInline`) all render in the mono stack with `font-variant-numeric: tabular-nums` so numbers/digits don't jitter.
- **Tabular numerals everywhere live values change** (stepper readout `.segValue`, dropdown names).
- **`.kbdInline` chip**: mono, `padding: 3px 6px`, `border-radius: 8px`, 1px `--border-2` border, white bg — the "keyboard key" look.
- **Uppercase eyebrows** for section labels (`text-transform: uppercase; letter-spacing: 0.08em;`) in 58% ink.
- **Ink hierarchy in text**: title full ink → body `--muted` (66%) → hints/statuses 50–62% — all the same warm ink, only alpha changes (see §2.2).
- `text-wrap: pretty` on multi-line helper text.

---

## 6. Layout, Spacing & Rails

- **Container:** `max-width: 1120px; margin: 0 auto; padding: 28px 18px 42px`.
- **Grid:** two-column `minmax(0, 1.3fr) minmax(0, 0.9fr)` with `gap: 18px` — asymmetric (preview 1.3× / controls 0.9×); collapses to 1 column below **980px**; single-column settings below **640px**.
- **Spacing tokens:** 8/12/16/20/28/36 (`--space-1..6`); cards pad 16px; blocks separate with 16px gaps and hairline dividers (`border-bottom: 1px solid rgba(21,19,18,0.1)`).
- **One control height to rule them all:** `--control-h: 46px` for the URL field and primary button, so the union looks machined.
- **Radii hierarchy:** 12px (cards/large controls) → 10px (small controls, icon links) → 8px (inline kbd) → 6px (SVG tiles) → 999px (chips).
- **Elevation hierarchy:** cards use `--shadow-1` (ambient 22px) or `--shadow-2` (dramatic 42px, for the live-preview card + dropdown overlay); generic controls get a single `0 1px 0 …` lip.
- Cards: `background: var(--surface); border: 1px solid var(--border); border-radius: 12px;` — always border *and* shadow, never shadow alone.

---

## 7. Accessibility & Motion Checklist

- `:focus-visible` used exclusively (never `:focus`) with a consistent 3px blue ring; `outline: none` paired with a visible replacement.
- `aria-pressed` on the theme segmented buttons; `aria-label` on icon links; `role="listbox"` + `role="option"` + `aria-selected` in the search dropdown; `aria-live="polite"` upload status; `.srOnly` class for visually-hidden labels.
- Hidden scrollbars (`scrollbar-width: none` + zero-width webkit scrollbar) — the page is a fixed app-like viewport.
- Single entrance animation degrades to its final state under `prefers-reduced-motion: reduce`; all transitions are ≤180ms so reduced-motion default tolerance is fine.
- `color-scheme: light` declared on `html` (the product UI itself is light-only; "dark theme" refers to generated icon tiles, not the site).

---

## 8. Port It — Quick-Start Template

Minimal skeleton carrying the full visual signature (tokens + background + one primary + one ghost button + brand marking):

```html
<style>
:root {
  --bg:#fbf7f8; --surface:#fff; --surface-2:#fbfaf7;
  --text:#151312; --muted:rgba(21,19,18,.66);
  --border:rgba(21,19,18,.16); --border-2:rgba(21,19,18,.1);
  --accent:#c5f80a; --accent-weak:rgba(197,248,10,.16);
  --danger:#c33b2e; --radius:12px; --radius-sm:10px;
  --shadow-1:0 1px 0 rgba(0,0,0,.05), 0 10px 22px rgba(0,0,0,.12);
  --shadow-2:0 1px 0 rgba(0,0,0,.06), 0 16px 42px rgba(0,0,0,.18);
  --container:1120px; --control-h:46px;
}
* { box-sizing: border-box; }
html { color-scheme: light; }
body {
  margin:0; min-height:100vh;
  font-family:"Inter Variable",Inter,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-optical-sizing:auto; font-variation-settings:"wght" 450;
  letter-spacing:-.01em; line-height:1.45;
  -webkit-font-smoothing:antialiased; font-synthesis:none;
  color:var(--text); background-color:var(--bg);
  background-image:
    radial-gradient(circle, rgba(0,0,0,.12) 1px, transparent 1px),
    radial-gradient(circle, rgba(201,157,163,.34) 1px, transparent 1px);
  background-size:22px 22px, 88px 88px;
  background-position:0 0, 18px 30px;
}
.shell { max-width:var(--container); margin:0 auto; padding:28px 18px 42px; }

/* primary = flat accent + sheen + edge + 2-depth shadows + press */
.primaryBtn {
  appearance:none; border:1px solid var(--border); border-radius:var(--radius);
  min-height:var(--control-h); padding:0 16px; font-size:13px;
  font-variation-settings:"wght" 560; letter-spacing:-.01em; cursor:pointer;
  background:linear-gradient(180deg, rgba(255,255,255,.2), rgba(0,0,0,.06)), var(--accent);
  color:rgba(10,10,10,.92);
  box-shadow:0 0 0 .5px rgba(0,0,0,.22), 0 1px 0 rgba(255,255,255,.55),
             0 2px 8px rgba(0,0,0,.12), 0 14px 28px rgba(0,0,0,.18);
  transition:border-color 160ms ease, background-position 160ms ease,
             box-shadow 180ms ease, transform 160ms ease;
}
.primaryBtn:hover {
  background:linear-gradient(180deg, rgba(255,255,255,.28), rgba(0,0,0,.08)), var(--accent);
  border-color:rgba(21,19,18,.24);
  box-shadow:0 0 0 .5px rgba(0,0,0,.22), 0 1px 0 rgba(255,255,255,.55),
             0 3px 10px rgba(0,0,0,.14), 0 18px 36px rgba(0,0,0,.24);
}
.primaryBtn:active {
  transform:translateY(1px) scale(.99);
  box-shadow:0 0 0 .5px rgba(0,0,0,.22), 0 1px 0 rgba(255,255,255,.35),
             inset 0 2px 12px rgba(0,0,0,.12), 0 10px 20px rgba(0,0,0,.16);
}
.primaryBtn:focus-visible { outline:none; box-shadow:0 0 0 3px rgba(64,125,255,.18); }

/* flat card */
.card {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius); box-shadow:var(--shadow-2); padding:16px;
}

/* focus-ring mixin for every interactive element */
.primaryBtn:focus-visible, .ghostBtn:focus-visible, .chip:focus-visible,
.iconLink:focus-visible, .input:focus, .segBtn:focus-visible {
  outline:none; box-shadow:0 0 0 3px rgba(64,125,255,.18);
}

/* highlighter brand marking (see §3.2 for full markup) */
.brandMarking { position:absolute; bottom:-18px; height:42px; color:var(--accent);
  transform:rotate(-3deg); mix-blend-mode:multiply; filter:blur(.25px) saturate(1.12); pointer-events:none; }
.markStroke { stroke-dasharray:1; stroke-dashoffset:1; opacity:.38; animation:draw 420ms ease-out forwards; }
@keyframes draw { to { stroke-dashoffset:0; } }
@media (prefers-reduced-motion: reduce) { .markStroke { animation:none; stroke-dashoffset:0; } }
</style>
```

### Fidelity checklist for the implementing agent

1. ☐ Warm paper `#fbf7f8` + dual dot-grid background (22px black 12% + 88px `#c99da3` 34%, offset 18,30).
2. ☐ **All** muted text/borders/hovers as `rgba(21,19,18, α)` — no gray hexes.
3. ☐ One accent (`#c5f80a`) used in ≤3 places; everything else monochrome ink.
4. ☐ Primary button = flat accent + 180° sheen gradient + 4-layer shadow recipe + press (translateY 1px + inset shadow).
5. ☐ Flat controls are white + 1px border + `0 1px 0` lip; selection states are inset shadows.
6. ☐ Focus = `0 0 0 3px rgba(64,125,255,0.18)` with `outline:none`, on `:focus-visible` only.
7. ☐ Interactive press = `scale(0.98–0.99)` / `translateY(-1px)` hover-lift for small items; 160ms ease / 180ms shadows.
8. ☐ Inter Variable with `font-variation-settings` weights (450 body, 550–560 emphasis), `font-synthesis: none`, `-0.01em` tracking, Geist Mono + tabular-nums for machine strings.
9. ☐ Uppercase 12px eyebrow labels; weight-driven hierarchy, not size-driven.
10. ☐ Brand marking: two staggered strokes, `pathLength="1"` dash animation, multiply blend, −3° rotate.
11. ☐ Icon tiles (if applicable): 48×48, `rx=6` bg, art centered in inner 32×32, theme palettes from §2.5, luminance recolor pass for dark monochrome logos.
12. ☐ Reduced-motion respected; inline SVG glyphs with `currentColor` only.
