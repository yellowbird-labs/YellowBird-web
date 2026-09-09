import React from 'react';
import { Project } from '@/types/projects';
import { formatRelativeTime } from '@/lib/utils';
import { Layers, Film, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-5 space-y-4 hover:border-zinc-700/80 transition-all duration-150 flex flex-col justify-between group shadow-sm hover:shadow-md"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-yellow-400 group-hover:bg-yellow-500/10 transition-colors">
              <Layers className="size-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold text-zinc-100 group-hover:text-white truncate max-w-[180px]">
                {project.name}
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">
                /{project.slug}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-400 text-pretty line-clamp-2">
          {project.description}
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 border-t border-zinc-850/60 pt-3 text-xs font-mono">
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1 uppercase">
            <Film className="size-3" /> Media
          </span>
          <span className="font-bold text-zinc-200 tabular-nums">
            {project.mediaCount}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1 uppercase">
            <Cpu className="size-3 text-blue-400" /> Active
          </span>
          <span className="font-bold text-blue-400 tabular-nums">
            {project.processingCount}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1 uppercase">
            <CheckCircle2 className="size-3 text-emerald-400" /> Ready
          </span>
          <span className="font-bold text-emerald-400 tabular-nums">
            {project.completedCount}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
        <span>Updated {formatRelativeTime(project.updatedAt)}</span>
        <span className="inline-flex items-center gap-1 text-zinc-400 group-hover:text-white transition-colors">
          Open <ArrowRight className="size-3" />
        </span>
      </div>
    </Link>
  );
}
