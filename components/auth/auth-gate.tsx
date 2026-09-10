'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authenticated = useSyncExternalStore(
    (onStoreChange) => { window.addEventListener('yb:auth-expired', onStoreChange); return () => window.removeEventListener('yb:auth-expired', onStoreChange); },
    () => Boolean(getSession()),
    () => false,
  );

  useEffect(() => {
    const redirect = () => router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`);
    if (!authenticated) redirect();
  }, [authenticated, pathname, router]);

  if (!authenticated) return <main className="yb-auth-loading"><span className="yb-auth-spinner" />Checking your workspace</main>;
  return children;
}
