'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, LogOut, Moon, Sun } from 'lucide-react';
import { readTheme, subscribeTheme, writeTheme, type ThemeName } from '@/lib/theme';
import { getSession, notifyAuthExpired } from '@/lib/auth/session';

const GITHUB_URL = 'https://github.com/amaanworks';
const DOCS_URL = '/docs';

function GitHubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function useCurrentTheme(): ThemeName {
  return useSyncExternalStore(subscribeTheme, readTheme, () => 'light' as ThemeName);
}

/** Sliding underline that glides between the active tab. */
function useIndicator(activeName: string) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ left: 0, width: 0, ready: false });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(`[data-tab="${activeName}"]`);
    if (!active) return;
    setBox({ left: active.offsetLeft, width: active.offsetWidth, ready: true });
  }, [activeName]);

  useLayoutEffect(() => {
    measure();
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);

  return { listRef, box };
}

function ThemeToggle() {
  const theme = useCurrentTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="yb-icon-btn yb-theme-toggle"
      onClick={() => writeTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <Sun className="ico-sun" size={16} strokeWidth={1.8} aria-hidden />
      <Moon className="ico-moon" size={16} strokeWidth={1.8} aria-hidden />
    </button>
  );
}

function AvatarMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const user = typeof window === 'undefined' ? null : getSession()?.user ?? null;
  const initial = (user?.name || 'Y').trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="yb-menu-anchor" ref={anchorRef}>
      <button
        type="button"
        className="yb-avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((current) => !current)}
      >
        {initial}
      </button>
      {open ? (
        <div className="yb-menu" role="menu">
          <div className="yb-menu-head">
            <strong>{user?.name || 'Yellowbird user'}</strong>
            <span>{user?.email || '—'}</span>
          </div>
          <button type="button" className="yb-menu-item is-danger" role="menuitem" onClick={() => { setOpen(false); notifyAuthExpired(); router.replace('/login'); }}>
            <LogOut size={14} strokeWidth={1.8} aria-hidden /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const active = pathname.startsWith('/library') ? 'library' : 'preview';
  const { listRef, box } = useIndicator(active);

  return (
    <header className="yb-nav">
      <Link href="/" className="yb-wordmark" aria-label="Yellowbird home">yellowbird</Link>

      <nav className="yb-nav-tabs" ref={listRef} aria-label="Primary">
        <Link href="/" data-tab="preview" className={`yb-nav-tab ${active === 'preview' ? 'is-active' : ''}`} aria-current={active === 'preview' ? 'page' : undefined}>Preview</Link>
        <Link href="/library" data-tab="library" className={`yb-nav-tab ${active === 'library' ? 'is-active' : ''}`} aria-current={active === 'library' ? 'page' : undefined}>Library</Link>
        <span
          className="yb-nav-indicator"
          aria-hidden="true"
          style={{
            width: box.width,
            transform: `translateX(${box.left}px)`,
            opacity: box.ready ? 1 : 0,
          }}
        />
      </nav>

      <div className="yb-nav-actions">
        <a className="yb-icon-btn yb-hide-sm" href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository" title="GitHub">
          <GitHubMark />
        </a>
        <a className="yb-icon-btn yb-hide-sm" href={DOCS_URL} aria-label="Docs" title="Docs">
          <BookOpen size={16} strokeWidth={1.8} aria-hidden />
        </a>
        <ThemeToggle />
        <AvatarMenu />
      </div>
    </header>
  );
}

// — Single-hairline navigation: wordmark, Preview/Library tabs, quiet utilities.
