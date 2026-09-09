'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createProject } from '@/lib/api/projects';
import { Project } from '@/types/projects';

export interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createProject({
        name: name.trim(),
        description: description.trim(),
      });
      onCreated(created);
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="CREATE PROJECT WORKSPACE"
      description="Define a new media ingestion workspace for dedicated streaming pipelines"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
        <div className="space-y-1.5">
          <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
            Project Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Odyssey VOD Ingest"
            required
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the media ingestion workflow..."
            rows={3}
            className="flex w-full rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500/80 transition-colors font-mono resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-850">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            size="sm"
            disabled={!name.trim()}
            isLoading={isSubmitting}
          >
            Create Project
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
