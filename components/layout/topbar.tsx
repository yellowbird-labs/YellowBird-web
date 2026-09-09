'use client';

import React from 'react';
import { Menu, ChevronRight, Activity, Terminal } from 'lucide-react';
import Link from 'next/link';

export interface TopbarProps {
  breadcrumbs?: { label: string; href?: string }[];
  title?: string;
  actions?: React.ReactNode;
  onOpenMobileMenu?: () => void;
}

export function Topbar({
  breadcrumbs = [],
  title,
  actions,
  onOpenMobileMenu,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-zinc-850 bg-zinc-950/80 px-4 sm:px-6 backdrop-blur-md">
      {/* Left Context & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu ? (
          <button
            onClick={onOpenMobileMenu}
            className="flex md:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 active:scale-95"
            aria-label="Open mobile menu"
          >
            <Menu className="size-4" />
          </button>
        ) : null}

        <div className="flex items-center gap-1.5 text-xs font-mono">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            yellowbird
          </Link>

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="size-3 text-zinc-600" />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-zinc-400 hover:text-zinc-200 transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-zinc-200 font-semibold truncate max-w-[150px] sm:max-w-[250px]">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right Actions & Health Indicators */}
      <div className="flex items-center gap-3">
        {/* System telemetry pill */}
        <div className="hidden lg:flex items-center gap-3 px-2.5 py-1 rounded-md border border-zinc-850 bg-zinc-900/60 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>Redis Lag:</span>
            <span className="text-zinc-200 tabular-nums">14ms</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1.5">
            <Activity className="size-3 text-emerald-400" />
            <span>Active Streams:</span>
            <span className="text-zinc-200 tabular-nums">2</span>
          </div>
        </div>

        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
