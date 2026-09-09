import React from 'react';
import { MediaItem } from '@/types/media';
import { MEDIA_STATUS_CONFIG } from '@/lib/tokens';
import { formatBytes, formatDuration, formatRelativeTime } from '@/lib/utils';
import { Film, ArrowRight, Video, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export interface MediaTableProps {
  mediaList: MediaItem[];
}

export function MediaTable({ mediaList }: MediaTableProps) {
  if (mediaList.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-850 p-8 text-center text-xs font-mono text-zinc-500">
        No media items found in this project.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-zinc-850 bg-zinc-900/40 text-[10px] text-zinc-500 uppercase tracking-wider">
              <th className="py-3 px-4">Media Asset</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Renditions</th>
              <th className="py-3 px-4">File Size</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Uploaded</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {mediaList.map((item) => {
              const statusConfig = MEDIA_STATUS_CONFIG[item.status] || MEDIA_STATUS_CONFIG.queued;

              return (
                <tr
                  key={item.id}
                  className="hover:bg-zinc-900/30 transition-colors group cursor-pointer"
                >
                  {/* Media filename & thumbnail */}
                  <td className="py-3 px-4">
                    <Link
                      href={`/media/${item.id}`}
                      className="flex items-center gap-3 group-hover:text-white"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-yellow-400/80 overflow-hidden">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film className="size-4" />
                        )}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-semibold text-zinc-200 group-hover:text-white block truncate max-w-[200px] sm:max-w-[260px]">
                          {item.filename}
                        </span>
                        <span className="text-[10px] text-zinc-500 block truncate">
                          {item.id}
                        </span>
                      </div>
                    </Link>
                  </td>

                  {/* Status & Progress */}
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${statusConfig.badgeClass}`}>
                        <span className={`size-1.5 rounded-full ${statusConfig.dotClass}`} />
                        {statusConfig.label}
                      </div>

                      {item.status === 'processing' ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-400">
                          <div className="w-16 bg-zinc-900 h-1 rounded-full overflow-hidden border border-blue-900/40">
                            <div
                              className="bg-blue-500 h-full rounded-full"
                              style={{ width: `${item.overallProgressPercent}%` }}
                            />
                          </div>
                          <span className="tabular-nums">{item.overallProgressPercent}%</span>
                        </div>
                      ) : null}
                    </div>
                  </td>

                  {/* Rendition Chips */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 flex-wrap">
                      {['thumb', 'prev', '360p', '720p', '1080p'].map((type, idx) => {
                        const job = item.jobs?.[idx];
                        const isDone = job?.status === 'completed';
                        const isRunning = job?.status === 'running';

                        return (
                          <span
                            key={type}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase border ${
                              isDone
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                : isRunning
                                ? 'bg-blue-950/60 text-blue-300 border-blue-700/50 animate-pulse'
                                : 'bg-zinc-900 text-zinc-600 border-zinc-850'
                            }`}
                          >
                            {type}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* File Size */}
                  <td className="py-3 px-4 text-zinc-400 tabular-nums">
                    {formatBytes(item.originalSizeBytes)}
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-4 text-zinc-400 tabular-nums">
                    {formatDuration(item.durationSeconds)}
                  </td>

                  {/* Uploaded time */}
                  <td className="py-3 px-4 text-zinc-500 tabular-nums">
                    {formatRelativeTime(item.uploadedAt)}
                  </td>

                  {/* Inspect CTA */}
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/media/${item.id}`}
                      className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
