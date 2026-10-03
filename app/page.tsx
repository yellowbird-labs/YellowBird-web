'use client';

import { ChangeEvent, DragEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AuthGate } from '@/components/auth/auth-gate';
import { NavBar } from '@/components/nav-bar';
import MediaStage from '@/components/workspace/media-stage';
import { ArrowUpRight, ChevronRight, FileImage, LoaderCircle, Play, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { createProject, getProjects, getRenditions, pollMediaUntilTerminal, uploadMedia, type Job, type Project, type Rendition as ApiRendition } from '@/lib/yellowbird-api';
import { hasAuthToken } from '@/lib/auth/session';
import { clearPreviewSelection, readPreviewSelection, saveLibraryItem, toLibraryRendition, updateLibraryItem, type LibraryItem } from '@/lib/workspace-store';

type Rendition = ApiRendition & { label: string; detail: string; ready: boolean };

function toUiRendition(rendition: ApiRendition): Rendition {
  const label = rendition.type === 'transcode' && rendition.height ? `${rendition.height}p` : rendition.type === 'thumbnail' ? 'Poster' : 'Preview';
  const detail = rendition.type === 'transcode' && rendition.height ? rendition.height === 1080 ? 'Full HD' : rendition.height === 720 ? 'HD' : 'SD' : rendition.type === 'thumbnail' ? 'Thumbnail' : '10 sec';
  return { ...rendition, label, detail, ready: true };
}

/** "720p" reads as "720p"; Poster/Preview stay as they are. */
function slideLabel(rendition: Rendition) {
  return /\dp$/.test(rendition.label) ? `${rendition.label}` : rendition.label;
}

function PreviewWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [renditions, setRenditions] = useState<Rendition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [seed, setSeed] = useState(() => readPreviewSelection());

  const isVideo = file ? (file.type ? file.type.startsWith('video/') : seed?.isVideo ?? true) : Boolean(seed?.url) && seed?.isVideo === true;
  const readyRenditions = renditions.filter((rendition) => rendition.ready && (isVideo ? rendition.mime_type.startsWith('video/') : rendition.mime_type.startsWith('image/')));
  const selectedRendition = readyRenditions.find((rendition) => rendition.id === selectedId) ?? readyRenditions[0];
  const thumbRenditions = renditions.filter((rendition) => rendition.ready && rendition.mime_type.startsWith('image/'));
  const activeMediaUrl = selectedRendition?.url || objectUrl || seed?.url || null;
  const jobProgress = jobs.length ? Math.round(jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length) : 0;
  const hasSource = Boolean(file || seed?.url);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  useEffect(() => {
    if (!hasAuthToken()) return;
    getProjects().then((items) => {
      setProjects(items);
      setProjectId((current) => current && items.some((project) => project.id === current) ? current : items.length === 1 ? items[0].id : '');
      setProjectLoadError(null);
    }).catch((requestError) => {
      setProjectLoadError(requestError instanceof Error ? requestError.message : 'Could not load projects.');
    }).finally(() => setProjectsLoading(false));
  }, []);

  // Arriving from the library ("watch in preview") with no local source in hand.
  useEffect(() => {
    if (!seed) return;
    getRenditions(seed.mediaId).then((items) => setRenditions(items.map(toUiRendition))).catch(() => setRenditions([]));
  }, [seed]);

  const seedLibraryItem = (mediaId: string, name: string, kind: 'video' | 'image'): LibraryItem => ({
    id: mediaId, fileName: name, kind, uploadedAt: new Date().toISOString(), status: 'processing', renditions: [],
  });

  const submitProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) { toast.error('Name your project first'); return; }
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
      toast.error('Could not create project', { description: message.includes('required') ? 'Enter a project name and try again.' : 'The project could not be created right now.' });
    } finally { setIsCreatingProject(false); }
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
    abortRef.current?.abort();
    const activeProjectId = projectId;
    if (!activeProjectId) {
      const description = projectLoadError ? 'Check your connection and try again.' : projectsLoading ? 'Wait a moment for your projects to load.' : 'Every upload belongs to a project.';
      toast.error(projectLoadError ? 'Could not load projects' : 'Project required', { description });
      return;
    }

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const nextUrl = URL.createObjectURL(incoming);
    clearPreviewSelection();
    setSeed(null);
    setFile(incoming);
    setObjectUrl(nextUrl);
    setRenditions([]);
    setSelectedId(null);
    setIsUploading(true);
    setUploadProgress(0);
    setIsProcessing(false);
    setJobs([]);

    const kind = incoming.type.startsWith('video/') ? 'video' : 'image';
    const uploadToast = toast.loading('Uploading source…', { description: incoming.name });
    try {
      const media = await uploadMedia(activeProjectId, incoming, setUploadProgress);
      setIsUploading(false);
      setIsProcessing(true);
      saveLibraryItem(seedLibraryItem(media.id, incoming.name, kind));
      toast.success('Upload received', { id: uploadToast, description: 'The backend queued your rendition jobs.' });
      const controller = new AbortController();
      abortRef.current = controller;
      const result = await pollMediaUntilTerminal(media.id, (nextMedia, nextJobs, nextRenditions) => {
        setJobs(nextJobs);
        const mapped = nextRenditions.map(toUiRendition);
        setRenditions(mapped);
        updateLibraryItem(media.id, { status: nextMedia.status === 'ready' ? 'ready' : nextMedia.status === 'failed' ? 'failed' : 'processing', renditions: nextRenditions.map(toLibraryRendition) });
        if (!selectedId && mapped[0]) setSelectedId(mapped[0].id);
      }, controller.signal);
      setIsProcessing(false);
      setRenditions(result.renditions.map(toUiRendition));
      updateLibraryItem(media.id, { status: 'ready', renditions: result.renditions.map(toLibraryRendition) });
      if (!selectedId && result.renditions[0]) setSelectedId(result.renditions[0].id);
      toast.success('Renditions ready', { description: `${result.renditions.length} outputs are waiting in the library.` });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'The backend could not process this media.';
      setIsUploading(false); setIsProcessing(false);
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      toast.error('Processing failed', { id: uploadToast, description: message });
    }
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
    abortRef.current?.abort();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    clearPreviewSelection();
    setFile(null); setObjectUrl(null); setRenditions([]); setSelectedId(null); setIsProcessing(false); setIsUploading(false); setUploadProgress(0); setJobs([]);
    setSeed(null);
  };

  const statusLabel = useMemo(() => {
    if (isUploading) return `Uploading ${uploadProgress}%`;
    if (isProcessing) return readyRenditions.length ? `${readyRenditions.length} outputs · ${jobProgress}%` : `Processing · ${jobProgress}%`;
    return 'Working';
  }, [isProcessing, isUploading, jobProgress, readyRenditions.length, uploadProgress]);

  const stackCards = (isVideo ? thumbRenditions : readyRenditions).slice().reverse();

  return (
    <main className="yb-shell">
      <NavBar />

      <section className="yb-strip">
        <div className="yb-output-label"><span className="yb-kicker">Outputs</span><span className="yb-count">{readyRenditions.length}/{renditions.length || '—'}</span></div>
        <div className="yb-rendition-rail">
          {readyRenditions.length ? readyRenditions.map((rendition) => (
            <button key={rendition.id} className={`yb-rendition-frame ${selectedRendition?.id === rendition.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(rendition.id)}>
              <span className="yb-frame-image">
                {rendition.mime_type.startsWith('image/') && rendition.url ? <img src={rendition.url} alt="" /> : null}
                {isVideo ? <span className="yb-frame-play"><Play className="size-2.5" fill="currentColor" aria-hidden /></span> : null}
              </span>
              <span className="yb-frame-label"><strong>{slideLabel(rendition)}</strong><small>{rendition.detail}</small></span>
            </button>
          )) : <div className="yb-rail-empty">{hasSource && (isProcessing || isUploading) ? <><LoaderCircle className="size-3.5 animate-spin" /> Building outputs</> : 'Outputs will appear here'}</div>}
        </div>
        <div className="yb-project-control">
          {projects.length > 1 ? (
            <label><span>Project</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Select project"><option value="" disabled>Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          ) : projects.length === 1 ? (
            <span className="yb-project-selected"><span>Project</span><strong>{projects[0].name}</strong></span>
          ) : (
            <button type="button" className="yb-project-create-link" onClick={() => setIsProjectFormOpen(true)} disabled={projectsLoading}>{projectsLoading ? 'Loading…' : 'Create project'}</button>
          )}
        </div>
        {hasSource ? <button type="button" className="yb-ghost-button" onClick={clearWorkspace} aria-label="Clear workspace"><X className="size-3.5" /> Clear</button> : null}
        <button className="yb-upload-primary" onClick={() => inputRef.current?.click()}><Upload className="size-4" aria-hidden /> Upload media</button>
      </section>

      {isProjectFormOpen ? <div className="yb-project-dialog-layer" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setIsProjectFormOpen(false); }}><div className="yb-project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title"><button type="button" className="yb-project-dialog-close" onClick={() => setIsProjectFormOpen(false)} aria-label="Close project creation"><X className="size-4" /></button><span className="yb-kicker">New project</span><h2 id="project-dialog-title">Where should this work live?</h2><p>Give your uploads a home before you begin.</p><form className="yb-project-form" onSubmit={submitProject}><label htmlFor="project-name">Project name</label><input id="project-name" autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Client films" maxLength={255} /><div className="yb-project-dialog-actions"><button type="button" onClick={() => setIsProjectFormOpen(false)}>Cancel</button><button type="submit" disabled={isCreatingProject}>{isCreatingProject ? <LoaderCircle className="size-3.5 animate-spin" /> : 'Create project'}</button></div></form></div></div> : null}

      <section className="yb-workbench">
        <div className="yb-board-shell">
          <MediaStage
            key={activeMediaUrl ?? 'empty-stage'}
            file={file}
            activeMediaUrl={activeMediaUrl}
            isVideo={isVideo}
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
                  <div
                    className="yb-stack-card"
                    key={rendition.id}
                    style={{
                      zIndex: 10 - index,
                      ['--pile-y' as string]: `${index * 9}px`,
                      ['--pile-scale' as string]: `${1 - index * 0.045}`,
                      animationDelay: `${Math.min(index, 3) * 40}ms`,
                    }}
                  >
                    <span className="yb-stack-thumb">
                      {rendition.url ? <img src={rendition.url} alt="" /> : objectUrl && !isVideo ? <img src={objectUrl} alt="" /> : <span className="yb-stack-gradient" />}
                    </span>
                    <span className="yb-stack-label"><strong>{slideLabel(rendition)}</strong><small>{file?.name || seed?.fileName || 'output'}</small></span>
                  </div>
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
