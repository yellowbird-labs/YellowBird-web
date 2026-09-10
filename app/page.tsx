'use client';

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronRight, FileImage, FileVideo, ImagePlus, LoaderCircle, Maximize2, Pause, Play, RotateCcw, RotateCw, Upload, Volume2, VolumeX, X, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { getProjects, hasAuthToken, pollMediaUntilTerminal, uploadMedia, type Job, type Media, type Project, type Rendition as ApiRendition } from '@/lib/yellowbird-api';

type Rendition = ApiRendition & { label: string; detail: string; ready: boolean };

function toUiRendition(rendition: ApiRendition): Rendition {
  const label = rendition.type === 'transcode' && rendition.height ? `${rendition.height}p` : rendition.type === 'thumbnail' ? 'Poster' : 'Preview';
  const detail = rendition.type === 'transcode' && rendition.height ? rendition.height === 1080 ? 'Full HD' : rendition.height === 720 ? 'HD' : 'SD' : rendition.type === 'thumbnail' ? 'Thumbnail' : '10 sec';
  return { ...rendition, label, detail, ready: true };
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [renditions, setRenditions] = useState<Rendition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaStatus, setMediaStatus] = useState<Media['status'] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(process.env.NEXT_PUBLIC_YELLOWBIRD_PROJECT_ID || '');
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const isVideo = file?.type.startsWith('video/') ?? false;
  const readyRenditions = renditions.filter((rendition) => rendition.ready && (isVideo ? rendition.mime_type.startsWith('video/') : rendition.mime_type.startsWith('image/')));
  const selectedRendition = readyRenditions.find((rendition) => rendition.id === selectedId) ?? readyRenditions[0];
  const fileKind = isVideo ? 'video' : 'image';
  const activeMediaUrl = selectedRendition?.url || objectUrl;
  const jobProgress = jobs.length ? Math.round(jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length) : 0;

  useEffect(() => () => {
    abortRef.current?.abort();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  useEffect(() => {
    if (!hasAuthToken() || projectId) return;
    getProjects().then((items) => {
      setProjects(items);
      if (items[0]) setProjectId(items[0].id);
    }).catch(() => undefined);
  }, [projectId]);

  const acceptFile = async (incoming: File) => {
    const valid = incoming.type.startsWith('video/') || incoming.type.startsWith('image/');
    if (!valid) {
      setError('Use a video or image file to start a rendition run.');
      toast.error('Unsupported file', { description: 'YellowBird accepts video and image files.' });
      return;
    }

    if (!hasAuthToken()) {
      toast.error('Authentication required', { description: 'Add a JWT to localStorage as yb_auth_token before uploading.' });
      return;
    }
    abortRef.current?.abort();
    let activeProjectId = projectId;
    if (!activeProjectId) {
      try {
        const availableProjects = projects.length ? projects : await getProjects();
        setProjects(availableProjects);
        activeProjectId = availableProjects[0]?.id || '';
        setProjectId(activeProjectId);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Could not load projects.';
        setError(message); toast.error('Could not load projects', { description: message }); return;
      }
    }
    if (!activeProjectId) {
      setError('Create a project in the backend before uploading media.');
      toast.error('No project available', { description: 'The upload API requires a project_id.' });
      return;
    }

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const nextUrl = URL.createObjectURL(incoming);
    setFile(incoming);
    setObjectUrl(nextUrl);
    setRenditions([]);
    setSelectedId(null);
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    setIsProcessing(false);
    setMediaStatus('uploading');
    setJobs([]);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setImageScale(1);
    setImageRotation(0);

    const uploadToast = toast.loading('Uploading source…', { description: incoming.name });
    try {
      const media = await uploadMedia(activeProjectId, incoming, setUploadProgress);
      setMediaStatus(media.status);
      setIsUploading(false);
      setIsProcessing(true);
      toast.success('Upload received', { id: uploadToast, description: 'The backend queued your rendition jobs.' });
      const controller = new AbortController();
      abortRef.current = controller;
      const result = await pollMediaUntilTerminal(media.id, (nextMedia, nextJobs, nextRenditions) => {
        setMediaStatus(nextMedia.status);
        setJobs(nextJobs);
        const mapped = nextRenditions.map(toUiRendition);
        setRenditions(mapped);
        if (!selectedId && mapped[0]) setSelectedId(mapped[0].id);
      }, controller.signal);
      setMediaStatus(result.media.status);
      setIsProcessing(false);
      setRenditions(result.renditions.map(toUiRendition));
      if (!selectedId && result.renditions[0]) setSelectedId(result.renditions[0].id);
      toast.success('Processing complete', { description: `${result.renditions.length} backend renditions are ready.` });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'The backend could not process this media.';
      setIsUploading(false); setIsProcessing(false);
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setMediaStatus('failed'); setError(message);
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
    setFile(null); setObjectUrl(null); setRenditions([]); setSelectedId(null); setIsProcessing(false); setIsUploading(false); setUploadProgress(0); setMediaStatus(null); setJobs([]); setError(null);
    setIsPlaying(false); setCurrentTime(0); setDuration(0); setImageScale(1); setImageRotation(0);
    toast('Workspace cleared', { description: 'Drop a new source to begin again.' });
  };

  const togglePlayback = async () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      try { await videoRef.current.play(); } catch { toast.error('Playback unavailable', { description: 'This browser could not start the local video.' }); }
    } else {
      videoRef.current.pause();
    }
  };

  const updateVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    if (videoRef.current) { videoRef.current.volume = nextVolume; videoRef.current.muted = nextVolume === 0; }
  };

  const toggleMute = () => updateVolume(volume === 0 ? 1 : 0);

  const seek = (nextTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const toggleFullscreen = async () => {
    const stage = document.querySelector('.yb-media-stage');
    if (!stage) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen();
  };

  const formatTime = (time: number) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;

  const statusLabel = useMemo(() => {
    if (error) return 'Needs attention';
    if (isUploading) return `Uploading ${uploadProgress}%`;
    if (isProcessing) return readyRenditions.length ? `${readyRenditions.length} renditions ready · ${jobProgress}%` : `Processing source · ${jobProgress}%`;
    if (file) return mediaStatus === 'ready' ? 'Ready to preview' : mediaStatus || 'Ready to preview';
    return 'Waiting for source';
  }, [error, file, isProcessing, isUploading, jobProgress, mediaStatus, readyRenditions.length, uploadProgress]);

  return (
    <main className="yb-shell">
      <header className="yb-minimal-nav"><Link href="/" className="yb-wordmark" aria-label="Yellowbird home"><span>yellowbird</span><i /></Link><div className="yb-nav-meta"><span><span className="yb-live-dot" /> local engine online</span><Link href="/library">Library <ArrowUpRight className="size-3" /></Link></div></header>

      <section className="yb-control-strip">
        <div className="yb-output-label"><span className="yb-kicker">Outputs</span><span className="yb-count">{readyRenditions.length}/{renditions.length || '—'}</span></div>
        <div className="yb-horizontal-renditions">{readyRenditions.length ? readyRenditions.map((rendition) => <button key={rendition.id} className={`yb-rendition-frame ${selectedRendition?.id === rendition.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(rendition.id)}><span className="yb-frame-image">{objectUrl && !isVideo ? <img src={objectUrl} alt="" /> : <span className="yb-frame-bars"><i /><i /><i /></span>}<span className="yb-frame-play">{isVideo ? <Play className="size-3" fill="currentColor" /> : <FileImage className="size-3" />}</span></span><span className="yb-frame-label"><strong>{rendition.label}{!isVideo && 'px'}</strong><small>{rendition.detail}</small></span></button>) : <div className="yb-rail-empty">{isProcessing ? <><LoaderCircle className="size-4 animate-spin" />Building outputs</> : 'Outputs will appear here'}</div>}</div>
        <button className="yb-upload-primary" onClick={() => inputRef.current?.click()}><Upload className="size-4" /> Upload media</button>
      </section>

      <section className="yb-workbench">
        <div className="yb-board-shell">
          <div className="yb-screw yb-screw-left" aria-hidden="true"><i /><i /><i /></div><div className="yb-screw yb-screw-right" aria-hidden="true"><i /><i /><i /></div>
          <div className={`yb-media-stage ${isDragging ? 'is-dragging' : ''} ${file ? 'has-media' : ''}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }} onDrop={onDrop}>
            {activeMediaUrl && isVideo ? <video key={activeMediaUrl} ref={videoRef} src={activeMediaUrl} className="yb-media-content" aria-label={`${file?.name} preview`} onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); event.currentTarget.volume = volume; event.currentTarget.playbackRate = playbackRate; }} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} /> : null}
            {activeMediaUrl && !isVideo ? <img src={activeMediaUrl} alt={`${file?.name} preview`} className="yb-media-content yb-image-content" style={{ transform: `scale(${imageScale}) rotate(${imageRotation}deg)` }} /> : null}
            {!file ? <div className="yb-drop-state"><div className="yb-drop-icon"><Upload className="size-5" /></div><strong>{isDragging ? 'Release to upload' : 'Drop media here'}</strong><span>Video or image · up to 2GB</span></div> : null}
            {isDragging ? <div className="yb-drag-overlay"><Upload className="size-6" /><span>Release to add source</span></div> : null}
            {file && (isUploading || isProcessing) ? <div className="yb-processing-chip"><LoaderCircle className="size-3.5 animate-spin" /> {statusLabel}</div> : null}
            {file && !isProcessing && !isUploading && !error ? <div className="yb-preview-chip"><Check className="size-3.5" /> {statusLabel}</div> : null}
            {activeMediaUrl && isVideo ? <div className="yb-player-controls" aria-label="Video controls"><button type="button" className="yb-player-icon" onClick={togglePlayback} aria-label={isPlaying ? 'Pause video' : 'Play video'}>{isPlaying ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}</button><span className="yb-player-time">{formatTime(currentTime)}</span><input className="yb-player-range yb-player-progress" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(Number(event.target.value))} aria-label="Video progress" /><span className="yb-player-time">{formatTime(duration)}</span><button type="button" className="yb-player-icon" onClick={toggleMute} aria-label={volume === 0 ? 'Unmute video' : 'Mute video'}>{volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button><input className="yb-player-range yb-volume-range" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => updateVolume(Number(event.target.value))} aria-label="Video volume" /><select className="yb-player-speed" value={playbackRate} onChange={(event) => { const rate = Number(event.target.value); setPlaybackRate(rate); if (videoRef.current) videoRef.current.playbackRate = rate; }} aria-label="Playback speed"><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select><button type="button" className="yb-player-icon" onClick={toggleFullscreen} aria-label="Toggle fullscreen"><Maximize2 className="size-4" /></button></div> : null}
            {activeMediaUrl && !isVideo ? <div className="yb-image-controls" aria-label="Image controls"><button type="button" className="yb-player-icon" onClick={() => setImageScale((scale) => Math.max(.5, scale - .25))} aria-label="Zoom out"><ZoomOut className="size-4" /></button><span>{Math.round(imageScale * 100)}%</span><button type="button" className="yb-player-icon" onClick={() => setImageScale((scale) => Math.min(3, scale + .25))} aria-label="Zoom in"><ZoomIn className="size-4" /></button><button type="button" className="yb-player-icon" onClick={() => setImageRotation((rotation) => rotation - 90)} aria-label="Rotate image left"><RotateCcw className="size-4" /></button><button type="button" className="yb-player-icon" onClick={() => setImageRotation((rotation) => rotation + 90)} aria-label="Rotate image right"><RotateCw className="size-4" /></button><button type="button" className="yb-player-icon" onClick={() => { setImageScale(1); setImageRotation(0); }} aria-label="Reset image view"><RotateCcw className="size-4" /></button></div> : null}
            <div className="yb-stage-caption"><span>{file ? file.name : 'SOURCE PREVIEW'}</span><span>{file ? (isVideo ? 'VIDEO' : 'IMAGE') : 'READY'}</span></div>
          </div>
          <div className="yb-board-footer"><div className="yb-source-info">{file ? <><span className="yb-file-icon">{isVideo ? <FileVideo className="size-3.5" /> : <FileImage className="size-3.5" />}</span><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB · {fileKind}</small></span></> : <><span className="yb-file-icon"><ImagePlus className="size-3.5" /></span><span><strong>No source selected</strong><small>Start with a local media file</small></span></>}</div><div className="yb-board-actions"><button className="yb-quiet-button" onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> Upload</button>{file ? <button className="yb-clear-button" onClick={clearWorkspace} aria-label="Clear workspace"><X className="size-3.5" /></button> : null}</div></div>
        </div>

        <Link href="/library" className="yb-library-preview" aria-label="Open library"><div className="yb-library-heading"><div><span className="yb-kicker">Library preview</span><h2>Generated work</h2></div><span className="yb-library-arrow"><ArrowUpRight className="size-4" /></span></div><div className="yb-card-stack">{readyRenditions.length ? readyRenditions.slice(0, 3).map((rendition, index) => <div className={`yb-stack-card card-${index + 1}`} key={rendition.id}><span className="yb-stack-thumb">{objectUrl && !isVideo ? <img src={objectUrl} alt="" /> : <span className="yb-stack-gradient" />}</span><span className="yb-stack-label"><strong>{rendition.label}{!isVideo && 'px'}</strong><small>{file?.name || 'output'} </small></span></div>) : <div className="yb-stack-empty"><span className="yb-stack-ghost ghost-one" /><span className="yb-stack-ghost ghost-two" /><div><span className="yb-stack-empty-icon"><FileImage className="size-4" /></span><strong>Your outputs live here</strong><small>Generated renditions will collect in the library.</small></div></div>}</div><div className="yb-library-footer"><span>View full library</span><ChevronRight className="size-3.5" /></div></Link>
      </section>

      <footer className="yb-bottom-note"><span><span className="yb-note-dot" /> Drag & drop is active on the preview</span><span className="yb-footer-shortcut"><span>⌘</span><span>O</span> to upload</span></footer>
      <input ref={inputRef} type="file" accept="video/*,image/*" onChange={onFileChange} className="yb-visually-hidden" />
    </main>
  );
}
