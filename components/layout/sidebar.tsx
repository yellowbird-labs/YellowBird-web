'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { isMockMode } from '@/lib/api/client';
import {
  Activity,
  Layers,
  Film,
  Cpu,
  Radio,
  ExternalLink,
  Zap,
} from 'lucide-react';

export interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isOpenMobile = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const mockMode = isMockMode();

  const navItems = [
    {
      label: 'Overview',
      href: '/',
      icon: Activity,
      exact: true,
      badge: 'LIVE',
    },
    {
      label: 'Projects',
      href: '/projects',
      icon: Layers,
      exact: false,
    },
    {
      label: 'Media Engine',
      href: '/media/media_launch_keynote',
      icon: Film,
      exact: false,
      badge: '5 JOBS',
    },
    {
      label: 'Distributed Jobs',
      href: '/jobs',
      icon: Cpu,
      exact: false,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-850 bg-zinc-950/95 backdrop-blur-md transition-transform duration-200 ease-out md:static md:translate-x-0',
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-850">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-tight text-zinc-100 hover:text-white transition-colors"
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              <Zap className="size-4 fill-yellow-400/30" />
            </div>
            <div className="flex flex-col">
              <span className="leading-tight font-bold tracking-wider">YellowBird</span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-normal leading-tight">MEDIA ENGINE</span>
            </div>
          </Link>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
            v1.2.0
          </span>
        </div>

        {/* Distributed Architecture Mini Breadcrumb */}
        <div className="px-3 py-2 border-b border-zinc-900 bg-zinc-900/30">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>PIPELINE</span>
            <span className="text-zinc-400">FFmpeg + Redis</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) || (item.href === '/media/media_launch_keynote' && pathname.startsWith('/media'));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-mono font-medium transition-[background-color,color,transform] active:scale-[0.98]',
                  isActive
                    ? 'bg-zinc-900 text-zinc-100 border border-zinc-800/80 shadow-xs'
                    : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      'size-4 transition-colors',
                      isActive ? 'text-yellow-400' : 'text-zinc-500 group-hover:text-zinc-300'
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded font-mono',
                      isActive
                        ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                        : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Utility Area */}
        <div className="p-3 border-t border-zinc-850 space-y-2 bg-zinc-950/60">
          {/* Engine Status */}
          <div className="rounded-lg border border-zinc-850 bg-zinc-900/40 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Radio className="size-3 text-emerald-400 animate-pulse" />
                API Ingest
              </span>
              <span className="text-emerald-400 font-semibold text-[10px]">
                {mockMode ? 'MOCK MODE' : 'ONLINE'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Environment</span>
              <span className="text-zinc-300">
                {mockMode ? 'Client Simulator' : 'Production Go API'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Workers</span>
              <span className="text-zinc-300">3 Online (2 Active)</span>
            </div>
          </div>

          {/* User Placeholder */}
          <div className="flex items-center justify-between px-2 py-1 text-xs text-zinc-500 font-mono">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500" />
              <span className="truncate text-zinc-400 text-[11px]">ops@yellowbird.sys</span>
            </div>
            <span className="text-[10px] text-zinc-600">v1.2</span>
          </div>
        </div>
      </aside>
    </>
  );
}
