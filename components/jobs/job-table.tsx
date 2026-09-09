'use client';

import React, { useState, useMemo } from 'react';
import { Job, JobStatus, JobType } from '@/types/jobs';
import { JobStatusBadge } from '@/components/processing/job-status-badge';
import { JOB_TYPE_CONFIG } from '@/lib/tokens';
import { formatDuration, formatDate, formatRelativeTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Search, Filter, ArrowRight, Video, Film, Image, Server } from 'lucide-react';
import Link from 'next/link';

export interface JobTableProps {
  initialJobs: Job[];
}

export function JobTable({ initialJobs }: JobTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredJobs = useMemo(() => {
    return initialJobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'all' && job.type !== typeFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = job.id.toLowerCase().includes(q);
        const matchFilename = job.input.filename.toLowerCase().includes(q);
        const matchWorker = job.workerId?.toLowerCase().includes(q);
        if (!matchId && !matchFilename && !matchWorker) {
          return false;
        }
      }
      return true;
    });
  }, [initialJobs, search, statusFilter, typeFilter]);

  const getJobIcon = (type: JobType) => {
    switch (type) {
      case 'thumbnail':
        return Image;
      case 'preview':
        return Film;
      default:
        return Video;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/70 p-3 rounded-xl border border-zinc-850">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job ID, media, or worker..."
            className="pl-9 font-mono text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-mono text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="queued">Queued</option>
              <option value="retrying">Retrying</option>
              <option value="failed">Failed</option>
            </Select>
          </div>

          <div className="w-full sm:w-40">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="font-mono text-xs"
            >
              <option value="all">All Types</option>
              <option value="thumbnail">Thumbnail</option>
              <option value="preview">Preview</option>
              <option value="360p">360p Transcode</option>
              <option value="720p">720p Transcode</option>
              <option value="1080p">1080p Transcode</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-850 bg-zinc-950/70 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-850 bg-zinc-900/40 text-[10px] text-zinc-500 uppercase tracking-wider">
                <th className="py-3 px-4">Job ID / Type</th>
                <th className="py-3 px-4">Source Media</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Worker Node</th>
                <th className="py-3 px-4">Attempt</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 font-mono">
                    No jobs match the specified criteria.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const Icon = getJobIcon(job.type);
                  const typeDef = JOB_TYPE_CONFIG[job.type];

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                    >
                      {/* Job ID & Type */}
                      <td className="py-3 px-4">
                        <Link href={`/jobs/${job.id}`} className="flex items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-blue-400 transition-colors">
                            <Icon className="size-3.5" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-zinc-200 group-hover:text-white block">
                              {typeDef.label}
                            </span>
                            <span className="text-[10px] text-zinc-500 block truncate max-w-[130px]">
                              {job.id}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* Media */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/media/${job.mediaId}`}
                          className="text-zinc-300 hover:text-white hover:underline truncate block max-w-[180px]"
                        >
                          {job.input.filename}
                        </Link>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <JobStatusBadge status={job.status} size="sm" />
                      </td>

                      {/* Worker */}
                      <td className="py-3 px-4 text-zinc-400">
                        {job.workerId ? (
                          <div className="flex items-center gap-1.5">
                            <Server className="size-3 text-zinc-600" />
                            <span>{job.workerId}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">unassigned</span>
                        )}
                      </td>

                      {/* Attempt */}
                      <td className="py-3 px-4 text-zinc-400 tabular-nums">
                        {job.attemptCount} / {job.maxAttempts}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 text-zinc-300 tabular-nums">
                        {job.durationSeconds ? formatDuration(job.durationSeconds) : '—'}
                      </td>

                      {/* Created */}
                      <td className="py-3 px-4 text-zinc-500 tabular-nums">
                        {formatRelativeTime(job.createdAt)}
                      </td>

                      {/* Inspect Link */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
