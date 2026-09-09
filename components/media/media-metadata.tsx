import React from 'react';
import { MediaItem } from '@/types/media';
import { formatBytes, formatDuration, formatDate } from '@/lib/utils';
import { MEDIA_STATUS_CONFIG } from '@/lib/tokens';
import {
  FileText,
  HardDrive,
  Clock,
  Maximize2,
  Cpu,
  Layers,
  Calendar,
} from 'lucide-react';

export interface MediaMetadataProps {
  media: MediaItem;
}

export function MediaMetadata({ media }: MediaMetadataProps) {
  const statusConfig = MEDIA_STATUS_CONFIG[media.status] || MEDIA_STATUS_CONFIG.queued;

  const metadataRows = [
    {
      label: 'Filename',
      value: media.filename,
      icon: FileText,
      copyable: true,
    },
    {
      label: 'MIME Type',
      value: media.mimeType,
      icon: Layers,
    },
    {
      label: 'File Size',
      value: formatBytes(media.originalSizeBytes),
      icon: HardDrive,
    },
    {
      label: 'Duration',
      value: formatDuration(media.durationSeconds),
      icon: Clock,
    },
    {
      label: 'Dimensions',
      value: `${media.width} × ${media.height} px`,
      icon: Maximize2,
    },
    {
      label: 'Video Codec',
      value: `${media.codec || 'H.264'} @ ${media.fps || 30} fps`,
      icon: Cpu,
    },
    {
      label: 'Uploaded At',
      value: formatDate(media.uploadedAt),
      icon: Calendar,
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
          Source Ingest Specifications
        </h3>

        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${statusConfig.badgeClass}`}>
          <span className={`size-1.5 rounded-full ${statusConfig.dotClass}`} />
          {statusConfig.label}
        </div>
      </div>

      {/* Grid of specifications */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        {metadataRows.map((row, index) => {
          const Icon = row.icon;
          return (
            <div
              key={index}
              className="rounded-lg border border-zinc-850/60 bg-zinc-900/30 p-2.5 space-y-1"
            >
              <dt className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase">
                <Icon className="size-3 text-zinc-600" />
                {row.label}
              </dt>
              <dd className="font-semibold text-zinc-200 truncate tabular-nums">
                {row.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
