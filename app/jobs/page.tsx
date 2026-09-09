'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { JobTable } from '@/components/jobs/job-table';
import { getJobs } from '@/lib/api/jobs';
import { Job } from '@/types/jobs';
import { Cpu, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    const data = await getJobs();
    setJobs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <AppShell
      breadcrumbs={[{ label: 'Distributed Jobs' }]}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={fetchJobs}
          isLoading={loading}
          className="font-mono text-xs"
        >
          <RefreshCw className="size-3.5" />
          <span>Refresh Feed</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/70 p-5 rounded-xl border border-zinc-850">
          <div className="space-y-1">
            <h1 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              <Cpu className="size-4 text-blue-400" />
              Distributed Transcode Jobs ({jobs.length})
            </h1>
            <p className="text-xs text-zinc-400 font-mono text-pretty">
              Real-time feed of all thumbnail, preview, 360p, 720p, and 1080p transcode tasks dispatched to worker nodes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Redis Stream: yellowbird:jobs</span>
          </div>
        </div>

        {/* Jobs Table */}
        <JobTable initialJobs={jobs} />
      </div>
    </AppShell>
  );
}
