'use client';

import React, { useEffect, useState, use } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { JobDetailsView } from '@/components/jobs/job-details-view';
import { getJobById } from '@/lib/api/jobs';
import { Job } from '@/types/jobs';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function JobDetailsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const resolvedParams = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getJobById(resolvedParams.jobId);
      setJob(data);
      setLoading(false);
    }
    load();
  }, [resolvedParams.jobId]);

  if (loading) {
    return (
      <AppShell breadcrumbs={[{ label: 'Jobs', href: '/jobs' }, { label: 'Loading...' }]}>
        <div className="p-16 text-center text-xs font-mono text-zinc-500 animate-pulse">
          Fetching distributed job trace...
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell breadcrumbs={[{ label: 'Jobs', href: '/jobs' }, { label: 'Not Found' }]}>
        <div className="rounded-xl border border-zinc-850 p-12 text-center space-y-3">
          <AlertCircle className="size-6 text-zinc-500 mx-auto" />
          <p className="text-xs font-mono text-zinc-400">Job not found in queue history</p>
          <Link href="/jobs">
            <Button variant="outline" size="sm" className="font-mono text-xs">
              Return to jobs feed
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Jobs', href: '/jobs' },
        { label: job.id },
      ]}
    >
      <JobDetailsView job={job} />
    </AppShell>
  );
}
