'use client';

import { ChangeEvent, DragEvent, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { AuthGate } from '@/components/auth/auth-gate';
import { NavBar } from '@/components/nav-bar';
import MediaStage from '@/components/workspace/media-stage';
import { ArrowUpRight, ChevronRight, FileImage, LoaderCircle, Play, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { createProject, getProjects, type Project } from '@/lib/yellowbird-api';
import { hasAuthToken } from '@/lib/auth/session';
import {
  clearWorkspaceSession,
  getWorkspaceFile,
  getWorkspaceObjectUrl,
  getWorkspaceSessionSnapshot,
  resumeWorkspacePollingIfNeeded,
  selectWorkspaceRendition,
  startWorkspaceUpload,
  subscribeWorkspaceSession,
  type LibraryRendition,
} from '@/lib/workspace-store';

/** "720p" reads as "720p"; Poster/Preview stay as they are. */
function slideLabel(rendition: LibraryRendition) {
  return /\dp$/.test(rendition.label) ? `${rendition.label}` : rendition.label;
}

const EMPTY_RENDITIONS: LibraryRendition[] = [];

function PreviewWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const session = useSyncExternalStore(
    subscribeWorkspaceSession,
    getWorkspaceSessionSnapshot,
    () => null
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    resumeWorkspacePollingIfNeeded();
  }, []);

  useEffect(() => {
    if (!hasAuthToken()) return;
    getProjects()
      .then((items) => {
        setProjects(items);
        setProjectId((current) => {
          if (current && items.some((p) => p.id === current)) return current;
          if (session?.projectId && items.some((p) => p.id === session.projectId)) return session.projectId;
          return items.length >= 1 ? items[0].id : '';
        });
        setProjectLoadError(null);
      })
      .catch((requestError) => {
        setProjectLoadError(requestError instanceof Error ? requestError.message : 'Could not load projects.');
      })
      .finally(() => setProjectsLoading(false));
  }, [session?.projectId]);

  const file = getWorkspaceFile();
  const objectUrl = getWorkspaceObjectUrl();
  const renditions = session?.renditions ?? EMPTY_RENDITIONS;
  const selectedId = session?.selectedRenditionId ?? null;
  const isUploading = session?.status === 'uploading';
  const isProcessing = session?.status === 'processing';
  const uploadProgress = session?.uploadProgress ?? 0;
  const jobs = session?.jobs ?? [];

  const readyRenditions = useMemo(() => {
    return renditions.filter((r) => r.ready !== false);
  }, [renditions]);

  const posterRendition = useMemo(() => {
    return readyRenditions.find((r) => r.mime_type.startsWith('image/') || r.type === 'thumbnail') ?? null;
  }, [readyRenditions]);

  const selectedRendition = useMemo(() => {
    if (selectedId) {
      return readyRenditions.find((r) => r.id === selectedId) ?? null;
    }
    return null;
  }, [readyRenditions, selectedId]);

  const isCurrentMediaVideo = Boolean(
    selectedRendition
      ? selectedRendition.mime_type
        ? selectedRendition.mime_type.startsWith('video/')
        : selectedRendition.type !== 'thumbnail'
      : file
      ? file.type
        ? file.type.startsWith('video/')
        : !file.name.match(/\.(jpe?g|png|webp|gif|svg)$/i)
      : session?.mimeType
      ? session.mimeType.startsWith('video/')
      : session?.kind
      ? session.kind === 'video'
      : true
  );

  const readyVideos = readyRenditions.filter((r) => r.mime_type.startsWith('video/'));
  const activeMediaUrl =
    selectedRendition?.url ||
    objectUrl ||
    (readyVideos.length > 0 && isCurrentMediaVideo ? readyVideos[0].url : null) ||
    session?.sourceUrl ||
    (readyRenditions[0]?.url ?? null);

  const posterUrl = isCurrentMediaVideo ? (posterRendition?.url ?? null) : null;
  const displayName = session?.fileName || file?.name || 'Source';
  const hasSource = Boolean(file || activeMediaUrl || session?.mediaId);
  const jobProgress = jobs.length ? Math.round(jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length) : 0;

  const stackCards = useMemo(() => {
    const thumbRenditions = renditions.filter((r) => r.ready !== false && r.mime_type.startsWith('image/'));
    const nonThumbRenditions = renditions.filter((r) => r.ready !== false && !r.mime_type.startsWith('image/'));
    const list = thumbRenditions.length > 0 ? thumbRenditions : nonThumbRenditions;
    return list.slice().reverse();
  }, [renditions]);

  const statusLabel = useMemo(() => {
    if (isUploading) return `Uploading ${uploadProgress}%`;
    if (isProcessing) {
      return readyRenditions.length ? `${readyRenditions.length} outputs · ${jobProgress}%` : `Processing · ${jobProgress}%`;
    }
    return 'Working';
  }, [isProcessing, isUploading, jobProgress, readyRenditions.length, uploadProgress]);

  const submitProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) {
      toast.error('Name your project first');
      return;
    }
    setIsCreatingProject(true);
    try {
      const project = await createProject({ name });
      setProjects((current) => [...current, project]);
      setProjectId(project.id);
      setProjectName('');
      setIsProjectFormOpen(false);
      setProjectLoadError(null);
      toast.success('Project created', { description: `${project.name} is ready for uploads.` });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Could not create the project.';
      toast.error('Could not create project', {
        description: message.includes('required') ? 'Enter a project name and try again.' : 'The project could not be created right now.',
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  const acceptFile = async (incoming: File) => {
    const valid = incoming.type.startsWith('video/') || incoming.type.startsWith('image/');
    if (!valid) {
      toast.error('Unsupported file', { description: 'YellowBird accepts video and image files.' });
      return;
    }

    if (!hasAuthToken()) {
      toast.error('Authentication required', { description: 'Sign in before uploading media.' });
      return;
    }

    const activeProjectId = projectId || (projects.length >= 1 ? projects[0].id : '');
    if (!activeProjectId) {
      const description = projectLoadError ? 'Check your connection and try again.' : projectsLoading ? 'Wait a moment for your projects to load.' : 'Every upload belongs to a project.';
      toast.error(projectLoadError ? 'Could not load projects' : 'Project required', { description });
      return;
    }

    await startWorkspaceUpload(activeProjectId, incoming);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) acceptFile(nextFile);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) acceptFile(nextFile);
  };

  const clearWorkspace = () => {
    clearWorkspaceSession();
    toast('Workspace cleared');
  };

  return (
    <main className="yb-shell">
      <NavBar />

      <section className="yb-strip">
        <div className="yb-output-label">
          <span className="yb-kicker">Outputs</span>
          <span className="yb-count">{readyRenditions.length}/{renditions.length || '—'}</span>
        </div>
        <div className="yb-rendition-rail">
          {readyRenditions.length ? (
            readyRenditions.map((rendition) => {
              const isSelected = selectedRendition ? selectedRendition.id === rendition.id : false;
              const isRenditionVideo = rendition.mime_type ? rendition.mime_type.startsWith('video/') : rendition.type !== 'thumbnail';
              return (
                <button
                  key={rendition.id}
                  type="button"
                  className={`yb-rendition-frame ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => selectWorkspaceRendition(rendition.id)}
                >
                  <span className="yb-frame-image">
                    {rendition.mime_type.startsWith('image/') && rendition.url ? (
                      <img src={rendition.url} alt="" />
                    ) : posterRendition?.url ? (
                      <img src={posterRendition.url} alt="" />
                    ) : null}
                    {isRenditionVideo ? (
                      <span className="yb-frame-play"><Play className="size-2.5" fill="currentColor" aria-hidden /></span>
                    ) : null}
                  </span>
                  <span className="yb-frame-label">
                    <strong>{slideLabel(rendition)}</strong>
                    <small>{rendition.detail}</small>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="yb-rail-empty">
              {hasSource && (isProcessing || isUploading) ? (
                <><LoaderCircle className="size-3.5 animate-spin" /> Building outputs</>
              ) : (
                'Outputs will appear here'
              )}
            </div>
          )}
        </div>
        <div className="yb-project-control">
          {projects.length > 1 ? (
            <label>
              <span>Project</span>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Select project">
                <option value="" disabled>Select project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
          ) : projects.length === 1 ? (
            <span className="yb-project-selected"><span>Project</span><strong>{projects[0].name}</strong></span>
          ) : (
            <button type="button" className="yb-project-create-link" onClick={() => setIsProjectFormOpen(true)} disabled={projectsLoading}>
              {projectsLoading ? 'Loading…' : 'Create project'}
            </button>
          )}
        </div>
        {hasSource ? (
          <button type="button" className="yb-ghost-button" onClick={clearWorkspace} aria-label="Clear workspace">
            <X className="size-3.5" /> Clear
          </button>
        ) : null}
        <button className="yb-upload-primary" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" aria-hidden /> Upload media
        </button>
      </section>

      {isProjectFormOpen ? (
        <div className="yb-project-dialog-layer" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setIsProjectFormOpen(false); }}>
          <div className="yb-project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title">
            <button type="button" className="yb-project-dialog-close" onClick={() => setIsProjectFormOpen(false)} aria-label="Close project creation"><X className="size-4" /></button>
            <span className="yb-kicker">New project</span>
            <h2 id="project-dialog-title">Where should this work live?</h2>
            <p>Give your uploads a home before you begin.</p>
            <form className="yb-project-form" onSubmit={submitProject}>
              <label htmlFor="project-name">Project name</label>
              <input id="project-name" autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Client films" maxLength={255} />
              <div className="yb-project-dialog-actions">
                <button type="button" onClick={() => setIsProjectFormOpen(false)}>Cancel</button>
                <button type="submit" disabled={isCreatingProject}>{isCreatingProject ? <LoaderCircle className="size-3.5 animate-spin" /> : 'Create project'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className="yb-workbench">
        <div className="yb-board-shell">
          <MediaStage
            file={file}
            fileName={displayName}
            activeMediaUrl={activeMediaUrl}
            isVideo={isCurrentMediaVideo}
            posterUrl={posterUrl}
            isDragging={isDragging}
            statusChip={hasSource && (isUploading || isProcessing) ? <div className="yb-processing-chip"><LoaderCircle className="size-3.5 animate-spin" aria-hidden /> {statusLabel}</div> : null}
            onDragEnter={() => setIsDragging(true)}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onBrowse={() => inputRef.current?.click()}
          />
        </div>

        <Link href="/library" className="yb-library-card" aria-label="Open the library">
          <div className="yb-library-heading">
            <div><span className="yb-kicker">Library</span><h2>Generated work</h2></div>
            <span className="yb-library-arrow"><ArrowUpRight className="size-4" aria-hidden /></span>
          </div>
          <div className="yb-card-stack">
            {stackCards.length ? (
              <>
                {stackCards.slice(0, 4).map((rendition, index) => (
                  <button
                    type="button"
                    className="yb-stack-card"
                    key={rendition.id}
                    style={{
                      zIndex: 10 - index,
                      ['--pile-y' as string]: `${index * 9}px`,
                      ['--pile-scale' as string]: `${1 - index * 0.045}`,
                      animationDelay: `${Math.min(index, 3) * 40}ms`,
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      selectWorkspaceRendition(rendition.id);
                    }}
                    title={`View ${slideLabel(rendition)}`}
                  >
                    <span className="yb-stack-thumb">
                      {rendition.url ? (
                        <img src={rendition.url} alt="" />
                      ) : objectUrl && !isCurrentMediaVideo ? (
                        <img src={objectUrl} alt="" />
                      ) : (
                        <span className="yb-stack-gradient" />
                      )}
                    </span>
                    <span className="yb-stack-label">
                      <strong>{slideLabel(rendition)}</strong>
                      <small>{displayName}</small>
                    </span>
                  </button>
                ))}
                {stackCards.length > 1 ? <span className="yb-stack-count">{stackCards.length} slides</span> : null}
              </>
            ) : (
              <div className="yb-stack-empty">
                <span className="yb-stack-ghost ghost-one" aria-hidden />
                <span className="yb-stack-ghost ghost-two" aria-hidden />
                <div>
                  <span className="yb-stack-empty-icon"><FileImage className="size-4" aria-hidden /></span>
                  <strong>Slides stack up here</strong>
                  <small>Thumbnails and stills land in this pile as each rendition finishes.</small>
                </div>
              </div>
            )}
          </div>
          <div className="yb-library-footer"><span>Open the library</span><ChevronRight className="size-3.5" aria-hidden /></div>
        </Link>
      </section>

      <input ref={inputRef} type="file" accept="video/*,image/*" onChange={onFileChange} className="yb-visually-hidden" />
    </main>
  );
}

/** Suspense keeps the shell responsive while the session gate resolves. */
export default function PreviewPage() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <PreviewWorkspace />
      </Suspense>
    </AuthGate>
  );
}
