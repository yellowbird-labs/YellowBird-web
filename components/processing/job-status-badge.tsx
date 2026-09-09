import React from 'react';
import { JobStatus } from '@/types/jobs';
import { JOB_STATUS_CONFIG } from '@/lib/tokens';
import { cn } from '@/lib/utils';

export interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
  size?: 'sm' | 'default';
}

export function JobStatusBadge({ status, className, size = 'default' }: JobStatusBadgeProps) {
  const config = JOB_STATUS_CONFIG[status] || JOB_STATUS_CONFIG.queued;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-mono font-medium border uppercase tracking-wider',
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        config.badgeClass,
        className
      )}
    >
      <span className={cn('rounded-full shrink-0', size === 'sm' ? 'size-1' : 'size-1.5', config.dotClass)} />
      {config.label}
    </span>
  );
}
