'use client';

import React, { useEffect, useState, use } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { MediaTable } from '@/components/media/media-table';
import { MediaUploadModal } from '@/components/media/media-upload-modal';
import { Button } from '@/components/ui/button';
import { getProjectById, getProjects } from '@/lib/api/projects';
import { getMediaItems } from '@/lib/api/media';
import { Project } from '@/types/projects';
import { MediaItem } from '@/types/media';
import {
  Layers,
  Film,
  Cpu,
  CheckCircle2,
  AlertOctagon,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [proj, allProjects, media] = await Promise.all([
        getProjectById(resolvedParams.projectId),
        getProjects(),
        getMediaItems(resolvedParams.projectId),
      ]);

      setProject(proj);
      setProjectsList(allProjects);
      setMediaList(media);
      setLoading(false);
    }
    load();
  }, [resolvedParams.projectId]);

  if (loading) {
    return (
      <AppShell breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Loading...' }]}>
        <div className="p-12 text-center text-xs font-mono text-zinc-500 animate-pulse">
          Loading project workspace telemetry...
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Not Found' }]}>
        <div className="rounded-xl border border-zinc-850 p-12 text-center space-y-3">
          <p className="text-xs font-mono text-zinc-400">Project workspace not found</p>
          <Link href="/projects">
            <Button variant="outline" size="sm" className="font-mono text-xs">
              Return to projects list
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const processingCount = mediaList.filter((m) => m.status === 'processing' || m.status === 'queued').length;
  const readyCount = mediaList.filter((m) => m.status === 'ready').length;
  const failedCount = mediaList.filter((m) => m.status === 'failed').length;

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: project.name },
      ]}
      actions={
        <Button
          variant="accent"
          size="sm"
          onClick={() => setUploadModalOpen(true)}
          className="font-mono text-xs"
        >
          <Plus className="size-3.5" />
          <span>Ingest Media File</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Project Header Banner */}
        <div className="rounded-xl border border-zinc-850 bg-zinc-950/80 p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <Link
                href="/projects"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="size-4" />
              </Link>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-base font-mono font-bold text-zinc-100">
                    {project.name}
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    /{project.slug}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono text-pretty max-w-2xl">
                  {project.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadModalOpen(true)}
                className="font-mono text-xs"
              >
                <Plus className="size-3.5" />
                <span>Upload Media</span>
              </Button>
            </div>
          </div>

          {/* Processing Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-zinc-850/80 pt-4 text-xs font-mono">
            <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase">
                <Film className="size-3 text-zinc-400" />
                Total Media
              </div>
              <span className="text-base font-bold text-zinc-100 tabular-nums">
                {mediaList.length}
              </span>
            </div>

            <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase">
                <Cpu className="size-3 text-blue-400" />
                Active In-Flight
              </div>
              <span className="text-base font-bold text-blue-400 tabular-nums">
                {processingCount}
              </span>
            </div>

            <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase">
                <CheckCircle2 className="size-3 text-emerald-400" />
                Ready (100%)
              </div>
              <span className="text-base font-bold text-emerald-400 tabular-nums">
                {readyCount}
              </span>
            </div>

            <div className="rounded-lg border border-zinc-850 bg-zinc-900/30 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase">
                <AlertOctagon className="size-3 text-rose-400" />
                Failed
              </div>
              <span className="text-base font-bold text-rose-400 tabular-nums">
                {failedCount}
              </span>
            </div>
          </div>
        </div>

        {/* Media Assets List Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              Media Assets ({mediaList.length})
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">
              Select any media to inspect its 5 distributed jobs
            </span>
          </div>

          <MediaTable mediaList={mediaList} />
        </div>
      </div>

      <MediaUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projects={projectsList}
        defaultProjectId={project.id}
      />
    </AppShell>
  );
}
