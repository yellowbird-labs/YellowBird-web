'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ProcessingPipeline } from '@/components/processing/processing-pipeline';
import { JobCard } from '@/components/processing/job-card';
import { RenditionList } from '@/components/processing/rendition-list';
import { MediaPlayer } from '@/components/media/media-player';
import { MediaMetadata } from '@/components/media/media-metadata';
import { JobStatusBadge } from '@/components/processing/job-status-badge';
import { MediaUploadModal } from '@/components/media/media-upload-modal';
import { Button } from '@/components/ui/button';
import { getMediaById } from '@/lib/api/media';
import { getProjects } from '@/lib/api/projects';
import { MediaItem } from '@/types/media';
import { Project } from '@/types/projects';
import { DemoProcessingStateMachine, DemoStepEvent } from '@/lib/demo/demo-processor';
import {
  Play,
  RotateCw,
  Plus,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Radio,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export default function MediaProcessingPage({
  params,
}: {
  params: Promise<{ mediaId: string }>;
}) {
  const resolvedParams = use(params);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const stateMachineRef = useRef<DemoProcessingStateMachine | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [mediaData, projData] = await Promise.all([
        getMediaById(resolvedParams.mediaId),
        getProjects(),
      ]);

      setMedia(mediaData);
      setProjects(projData);
      setLoading(false);

      if (mediaData) {
        stateMachineRef.current = new DemoProcessingStateMachine(mediaData);
      }
    }
    load();

    return () => {
      if (stateMachineRef.current) {
        stateMachineRef.current.stop();
      }
    };
  }, [resolvedParams.mediaId]);

  const handleRunDemoSimulation = () => {
    if (!media) return;

    if (!stateMachineRef.current) {
      stateMachineRef.current = new DemoProcessingStateMachine(media);
    }

    setDemoActive(true);
    stateMachineRef.current.subscribe((event: DemoStepEvent) => {
      setMedia(event.media);
      setDemoMessage(event.message);
      if (event.stepIndex >= 6) {
        setDemoActive(false);
      }
    });

    stateMachineRef.current.start();
  };

  const handleResetDemo = () => {
    if (stateMachineRef.current) {
      stateMachineRef.current.reset();
      setDemoActive(false);
      setDemoMessage('Simulation reset to queued state');
    }
  };

  if (loading) {
    return (
      <AppShell breadcrumbs={[{ label: 'Media Engine', href: '/projects' }, { label: 'Loading...' }]}>
        <div className="p-16 text-center text-xs font-mono text-zinc-500 animate-pulse">
          Connecting to distributed transcode pipeline...
        </div>
      </AppShell>
    );
  }

  if (!media) {
    return (
      <AppShell breadcrumbs={[{ label: 'Media Engine', href: '/projects' }, { label: 'Not Found' }]}>
        <div className="rounded-xl border border-zinc-850 p-12 text-center space-y-3">
          <AlertCircle className="size-6 text-zinc-500 mx-auto" />
          <p className="text-xs font-mono text-zinc-400">Media asset not found in database</p>
          <Link href="/">
            <Button variant="outline" size="sm" className="font-mono text-xs">
              Return to dashboard
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: media.projectName || 'Project Workspace', href: `/projects/${media.projectId}` },
        { label: media.filename },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="accent"
            size="sm"
            onClick={handleRunDemoSimulation}
            disabled={demoActive}
            isLoading={demoActive}
            className="font-mono text-xs shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            <Sparkles className="size-3.5 text-yellow-300" />
            <span>{demoActive ? 'Simulating Pipeline...' : 'Run Demo Processing'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            className="font-mono text-xs"
          >
            <Plus className="size-3.5" />
            <span>Ingest Another</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Hero Media Header Card */}
        <div className="rounded-xl border border-zinc-850 bg-zinc-950/80 p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <Link
                href={`/projects/${media.projectId}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
                title="Return to project"
              >
                <ArrowLeft className="size-4" />
              </Link>

              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-base sm:text-lg font-mono font-bold text-zinc-100">
                    {media.filename}
                  </h1>
                  <JobStatusBadge status={media.status as any} />
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Layers className="size-3 text-zinc-500" />
                    <span>Project:</span>
                    <Link
                      href={`/projects/${media.projectId}`}
                      className="text-zinc-200 hover:text-white underline underline-offset-2"
                    >
                      {media.projectName || 'Atlas VOD'}
                    </Link>
                  </span>
                  <span>•</span>
                  <span>ID: <span className="text-zinc-300 select-all">{media.id}</span></span>
                </div>
              </div>
            </div>

            {/* Interactive Demo Simulation Controls */}
            <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-850">
              <Button
                variant={demoActive ? 'secondary' : 'accent'}
                size="sm"
                onClick={handleRunDemoSimulation}
                disabled={demoActive}
                isLoading={demoActive}
                className="font-mono text-xs"
              >
                <Play className="size-3 text-yellow-400 fill-current" />
                <span>{demoActive ? 'Processing In-Flight...' : 'Run Demo Processing'}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDemo}
                className="font-mono text-xs text-zinc-400 hover:text-zinc-200"
              >
                <RotateCw className="size-3" />
                <span>Reset</span>
              </Button>
            </div>
          </div>

          {/* Simulation Status Ticker */}
          {demoMessage ? (
            <div className="rounded-lg border border-blue-900/40 bg-blue-950/30 p-2.5 flex items-center justify-between text-xs font-mono text-blue-300 animate-pulse">
              <div className="flex items-center gap-2">
                <Radio className="size-3.5 text-blue-400 shrink-0" />
                <span>[SIMULATION STREAM]: {demoMessage}</span>
              </div>
              <span className="text-[10px] text-blue-400 font-bold uppercase">
                Step {stateMachineRef.current?.getCurrentMedia().overallProgressPercent || 0}%
              </span>
            </div>
          ) : null}
        </div>

        {/* Top Split: Media Preview (Left) & Technical Metadata (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <MediaPlayer media={media} />
          </div>

          <div className="lg:col-span-5 flex flex-col justify-center">
            <MediaMetadata media={media} />
          </div>
        </div>

        {/* The Central Hero: Processing Pipeline Component */}
        <ProcessingPipeline media={media} />

        {/* The 5 Generated Jobs Matrix */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                Generated Transcode Jobs (5 Profiles)
              </h2>
              <p className="text-[11px] font-mono text-zinc-500">
                Dispatched concurrently across Redis Streams to distributed Go workers
              </p>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
              <span className="size-2 rounded-full bg-blue-400 animate-pulse" />
              <span>5 Task Matrix</span>
            </div>
          </div>

          {/* 5 Job Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {media.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>

        {/* Published Renditions Table */}
        <RenditionList renditions={media.renditions} />
      </div>

      <MediaUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projects={projects}
        defaultProjectId={media.projectId}
      />
    </AppShell>
  );
}
