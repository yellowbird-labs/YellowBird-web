'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, hasAuthToken } from '@/lib/auth/session';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authenticated = useSyncExternalStore(
    (onStoreChange) => { window.addEventListener('yb:auth-expired', onStoreChange); return () => window.removeEventListener('yb:auth-expired', onStoreChange); },
    () => Boolean(getSession()),
    () => false,
  );

  useEffect(() => {
    // Read the session fresh at effect time: the hydration snapshot is always
    // "false", so deciding on the snapshot alone would bounce valid sessions.
    if (hasAuthToken()) return;
    router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`);
  }, [authenticated, pathname, router]);

  if (!authenticated) return <main className="yb-auth-loading"><span className="yb-auth-spinner" />Checking your workspace</main>;
  return children;
}
