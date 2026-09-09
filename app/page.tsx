'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/dashboard/stat-card';
import { WorkerStatusList } from '@/components/dashboard/worker-status';
import { QueueOverview } from '@/components/dashboard/queue-overview';
import { ActivityList } from '@/components/dashboard/activity-list';
import { MediaUploadModal } from '@/components/media/media-upload-modal';
import { Button } from '@/components/ui/button';
import { getProjects } from '@/lib/api/projects';
import { getMediaItems } from '@/lib/api/media';
import { getWorkers, getQueueMetrics } from '@/lib/api/workers';
import { getJobs } from '@/lib/api/jobs';
import { Project } from '@/types/projects';
import { MediaItem } from '@/types/media';
import { WorkerInfo, QueueMetrics } from '@/types/worker';
import { Job } from '@/types/jobs';
import {
  Layers,
  Film,
  Cpu,
  CheckCircle2,
  AlertOctagon,
  Plus,
  Play,
  Flame,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [projData, mediaData, workerData, queueData, jobsData] = await Promise.all([
        getProjects(),
        getMediaItems(),
        getWorkers(),
        getQueueMetrics(),
        getJobs(),
      ]);

      setProjects(projData);
      setMediaList(mediaData);
      setWorkers(workerData);
      setQueueMetrics(queueData);
      setJobs(jobsData);
    }
    loadData();
  }, []);

  const totalProjects = projects.length;
  const totalMedia = mediaList.length;
  const processingMediaCount = mediaList.filter((m) => m.status === 'processing' || m.status === 'queued').length;
  const completedJobsCount = queueMetrics?.totalCompleted24h || 359;
  const failedJobsCount = queueMetrics?.totalFailed24h || 3;

  return (
    <AppShell
      breadcrumbs={[{ label: 'Dashboard Overview' }]}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/media/media_launch_keynote">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex text-xs font-mono">
              <Play className="size-3 text-yellow-400 fill-current" />
              <span>Interactive Pipeline</span>
            </Button>
          </Link>
          <Button
            variant="accent"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            className="text-xs font-mono"
          >
            <Plus className="size-3.5" />
            <span>Ingest Media</span>
          </Button>
        </div>
      }
    >
      {/* Top Banner: Architecture Context */}
      <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-blue-400" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-300">
              YellowBird Distributed Engine Status
            </h2>
          </div>
          <p className="text-xs text-zinc-300 font-mono text-pretty">
            Live telemetry stream from Go worker pool and Redis Streams. FFmpeg transcode matrix operational.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/media/media_launch_keynote">
            <Button variant="default" size="sm" className="font-mono text-xs shadow-md">
              <span>Inspect Live Media Processing</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 5 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Projects"
          value={totalProjects}
          sublabel="Active workspaces"
          icon={Layers}
          variant="default"
        />
        <StatCard
          title="Media Assets"
          value={totalMedia}
          sublabel="Master video files"
          icon={Film}
          variant="default"
        />
        <StatCard
          title="Processing"
          value={processingMediaCount}
          sublabel="Queued / in-flight"
          icon={Cpu}
          variant="running"
          trend="2 workers"
        />
        <StatCard
          title="Completed (24h)"
          value={completedJobsCount}
          sublabel="Renditions published"
          icon={CheckCircle2}
          variant="completed"
          trend="100% SLA"
        />
        <StatCard
          title="Failed / Retries"
          value={failedJobsCount}
          sublabel="Automatic retry active"
          icon={AlertOctagon}
          variant="failed"
          trend="0.8% error rate"
        />
      </div>

      {/* Main Split: Worker Status (Left) & Queue Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WorkerStatusList workers={workers} />
          <ActivityList recentJobs={jobs} />
        </div>

        <div className="space-y-6">
          {queueMetrics ? <QueueOverview metrics={queueMetrics} /> : null}

          {/* Quick Shortcuts to Projects */}
          <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
                Active Projects
              </h3>
              <Link href="/projects" className="text-[11px] font-mono text-zinc-400 hover:text-white">
                View all ({projects.length})
              </Link>
            </div>

            <div className="space-y-2">
              {projects.slice(0, 3).map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-850 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-800 transition-colors group"
                >
                  <div className="space-y-0.5 truncate">
                    <span className="text-xs font-mono font-semibold text-zinc-200 group-hover:text-white block truncate">
                      {p.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 block">
                      {p.mediaCount} media files • {p.processingCount} in-flight
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-300 font-mono">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ingest Modal */}
      <MediaUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projects={projects}
      />
    </AppShell>
  );
}
