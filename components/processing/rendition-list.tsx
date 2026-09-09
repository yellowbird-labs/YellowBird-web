import React from 'react';
import { RenditionOutput } from '@/types/jobs';
import { formatBytes } from '@/lib/utils';
import { ExternalLink, Film, Image, CheckCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RenditionListProps {
  renditions: RenditionOutput[];
}

export function RenditionList({ renditions }: RenditionListProps) {
  if (!renditions || renditions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-850 bg-zinc-950/40 p-6 text-center space-y-1">
        <Film className="size-6 text-zinc-600 mx-auto" />
        <p className="text-xs font-mono text-zinc-400">No output renditions published yet</p>
        <p className="text-[10px] font-mono text-zinc-600">Renditions appear as worker nodes complete transcodes</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-emerald-400" />
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
            Published Multi-Bitrate Renditions ({renditions.length} / 5)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">Cloudinary VOD Master Set</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-zinc-850 text-[10px] text-zinc-500 uppercase tracking-wider">
              <th className="py-2 px-3">Asset Type</th>
              <th className="py-2 px-3">Resolution</th>
              <th className="py-2 px-3">Bitrate</th>
              <th className="py-2 px-3">Format</th>
              <th className="py-2 px-3">Size</th>
              <th className="py-2 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {renditions.map((r, i) => (
              <tr key={i} className="hover:bg-zinc-900/40 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    {r.jobType === 'thumbnail' ? (
                      <Image className="size-3.5 text-zinc-400" />
                    ) : r.jobType === 'preview' ? (
                      <Film className="size-3.5 text-blue-400" />
                    ) : (
                      <Video className="size-3.5 text-emerald-400" />
                    )}
                    <span className="font-semibold text-zinc-200 uppercase">{r.jobType}</span>
                  </div>
                </td>

                <td className="py-2.5 px-3 text-zinc-300 tabular-nums">
                  {r.resolution || '—'}
                </td>

                <td className="py-2.5 px-3 text-zinc-400 tabular-nums">
                  {r.bitrateKbps ? `${r.bitrateKbps} kbps` : 'Constant Quality'}
                </td>

                <td className="py-2.5 px-3 text-zinc-400">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]">
                    {r.format}
                  </span>
                </td>

                <td className="py-2.5 px-3 text-emerald-400 font-semibold tabular-nums">
                  {formatBytes(r.fileSizeBytes)}
                </td>

                <td className="py-2.5 px-3 text-right">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>View CDN</span>
                    <ExternalLink className="size-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
