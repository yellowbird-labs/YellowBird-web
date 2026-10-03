'use client';

export type ThemeName = 'light' | 'dark';

const THEME_KEY = 'yb:theme';
const THEME_EVENT = 'yb:theme-changed';

export function readTheme(): ThemeName {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function writeTheme(theme: ThemeName) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent(THEME_EVENT));
}

export function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

// — Shadow-Grey / Cerulean theme switch shared by every surface.
