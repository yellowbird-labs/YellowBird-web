'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ProjectCard } from '@/components/projects/project-card';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProjects } from '@/lib/api/projects';
import { Project } from '@/types/projects';
import { Plus, Search, Layers } from 'lucide-react';

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getProjects();
      setProjects(data);
    }
    load();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [projects, search]);

  return (
    <AppShell
      breadcrumbs={[{ label: 'Projects' }]}
      actions={
        <Button
          variant="accent"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="font-mono text-xs"
        >
          <Plus className="size-3.5" />
          <span>New Project</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/70 p-5 rounded-xl border border-zinc-850">
          <div className="space-y-1">
            <h1 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              <Layers className="size-4 text-yellow-400" />
              Project Workspaces ({projects.length})
            </h1>
            <p className="text-xs text-zinc-400 font-mono text-pretty">
              Isolated VOD and live media transcode profiles partitioned by service and delivery tier.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-9 font-mono text-xs"
            />
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {filteredProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-850 p-12 text-center text-xs font-mono text-zinc-500">
            No project workspaces found matching &quot;{search}&quot;.
          </div>
        ) : null}
      </div>

      <CreateProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(newProj) => setProjects([newProj, ...projects])}
      />
    </AppShell>
  );
}
