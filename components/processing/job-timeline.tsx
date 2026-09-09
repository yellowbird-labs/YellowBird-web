import React from 'react';
import { JobEvent } from '@/types/jobs';
import { formatDate } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  Server,
  Zap,
  CloudUpload,
  AlertOctagon,
  RotateCw,
} from 'lucide-react';

export interface JobTimelineProps {
  events: JobEvent[];
}

export function JobTimeline({ events }: JobTimelineProps) {
  const getStageIcon = (stage: JobEvent['stage']) => {
    switch (stage) {
      case 'created':
        return Clock;
      case 'queued':
        return Zap;
      case 'claimed':
        return Server;
      case 'processing':
        return RotateCw;
      case 'uploaded':
        return CloudUpload;
      case 'completed':
        return CheckCircle2;
      case 'failed':
        return AlertOctagon;
      case 'retried':
        return RotateCw;
      default:
        return Clock;
    }
  };

  const getStageColor = (stage: JobEvent['stage']) => {
    switch (stage) {
      case 'completed':
        return 'text-emerald-400 bg-emerald-950 border-emerald-700/60';
      case 'failed':
        return 'text-rose-400 bg-rose-950 border-rose-700/60';
      case 'processing':
      case 'claimed':
        return 'text-blue-400 bg-blue-950 border-blue-700/60';
      case 'retried':
        return 'text-amber-400 bg-amber-950 border-amber-700/60';
      default:
        return 'text-zinc-400 bg-zinc-900 border-zinc-800';
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-800">
      {events.map((event, index) => {
        const Icon = getStageIcon(event.stage);
        const colorClass = getStageColor(event.stage);

        return (
          <div key={event.id || index} className="relative group">
            {/* Dot/Icon on Timeline Line */}
            <div
              className={`absolute -left-6 top-0 flex size-5 items-center justify-center rounded-full border text-[10px] ${colorClass}`}
            >
              <Icon className="size-2.5" />
            </div>

            {/* Event Content */}
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-mono font-semibold text-zinc-200">
                  {event.label}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0 tabular-nums">
                  {formatDate(event.timestamp)}
                </span>
              </div>

              {event.description ? (
                <p className="text-xs text-zinc-400 text-pretty font-mono">
                  {event.description}
                </p>
              ) : null}

              {event.workerId ? (
                <div className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 bg-zinc-900/60 px-1.5 py-0.5 rounded border border-zinc-850">
                  <Server className="size-2.5 text-zinc-400" />
                  <span>Node: {event.workerId}</span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
