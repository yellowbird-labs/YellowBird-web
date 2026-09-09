'use client';

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronRight, FileImage, FileVideo, ImagePlus, LoaderCircle, Maximize2, Pause, Play, RotateCcw, RotateCw, Upload, Volume2, VolumeX, X, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';

type Rendition = { id: string; label: string; detail: string; ready: boolean };

const videoRenditions: Rendition[] = [
  { id: '1080', label: '1080p', detail: 'Full HD', ready: false },
  { id: '720', label: '720p', detail: 'HD', ready: false },
  { id: '480', label: '480p', detail: 'SD', ready: false },
  { id: '360', label: '360p', detail: 'Compact', ready: false },
];

const imageRenditions: Rendition[] = [
  { id: 'large', label: '2048', detail: 'Large', ready: false },
  { id: 'medium', label: '1280', detail: 'Medium', ready: false },
  { id: 'small', label: '640', detail: 'Compact', ready: false },
];

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [renditions, setRenditions] = useState<Rendition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const isVideo = file?.type.startsWith('video/') ?? false;
  const readyRenditions = renditions.filter((rendition) => rendition.ready);
  const selectedRendition = readyRenditions.find((rendition) => rendition.id === selectedId) ?? readyRenditions[0];
  const fileKind = isVideo ? 'video' : 'image';

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const acceptFile = (incoming: File) => {
    const valid = incoming.type.startsWith('video/') || incoming.type.startsWith('image/');
    if (!valid) {
      setError('Use a video or image file to start a rendition run.');
      toast.error('Unsupported file', { description: 'YellowBird accepts video and image files.' });
      return;
    }

    timersRef.current.forEach(clearTimeout);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const nextUrl = URL.createObjectURL(incoming);
    const nextRenditions = (incoming.type.startsWith('video/') ? videoRenditions : imageRenditions).map((rendition) => ({ ...rendition }));
    setFile(incoming);
    setObjectUrl(nextUrl);
    setRenditions(nextRenditions);
    setSelectedId(null);
    setError(null);
    setIsProcessing(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setImageScale(1);
    setImageRotation(0);

    toast.success('Upload received', { description: `${incoming.name} is ready to process.` });
    toast('Queued for processing', { description: 'Your source is in the rendition queue.', duration: 2500 });
    timersRef.current = nextRenditions.map((rendition, index) => setTimeout(() => {
      setRenditions((current) => current.map((item) => item.id === rendition.id ? { ...item, ready: true } : item));
      toast.success(`${rendition.label} ready`, { description: `${rendition.detail} rendition is available.` });
      if (index === 0) setSelectedId(rendition.id);
      if (index === nextRenditions.length - 1) {
        setIsProcessing(false);
        toast.success('Processing complete', { description: 'All available renditions are ready.' });
      }
    }, 850 + index * 650));
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
    timersRef.current.forEach(clearTimeout);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setFile(null); setObjectUrl(null); setRenditions([]); setSelectedId(null); setIsProcessing(false); setError(null);
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
    if (isProcessing) return readyRenditions.length ? `${readyRenditions.length} renditions ready` : 'Processing source';
    if (file) return 'Ready to preview';
    return 'Waiting for source';
  }, [error, file, isProcessing, readyRenditions.length]);

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
            {objectUrl && isVideo ? <video ref={videoRef} src={objectUrl} className="yb-media-content" aria-label={`${file?.name} preview`} onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); event.currentTarget.volume = volume; }} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} /> : null}
            {objectUrl && !isVideo ? <img src={objectUrl} alt={`${file?.name} preview`} className="yb-media-content yb-image-content" style={{ transform: `scale(${imageScale}) rotate(${imageRotation}deg)` }} /> : null}
            {!file ? <div className="yb-drop-state"><div className="yb-drop-icon"><Upload className="size-5" /></div><strong>{isDragging ? 'Release to upload' : 'Drop media here'}</strong><span>Video or image · up to 2GB</span></div> : null}
            {isDragging ? <div className="yb-drag-overlay"><Upload className="size-6" /><span>Release to add source</span></div> : null}
            {file && isProcessing ? <div className="yb-processing-chip"><LoaderCircle className="size-3.5 animate-spin" /> {statusLabel}</div> : null}
            {file && !isProcessing && !error ? <div className="yb-preview-chip"><Check className="size-3.5" /> {statusLabel}</div> : null}
            {objectUrl && isVideo ? <div className="yb-player-controls" aria-label="Video controls"><button type="button" className="yb-player-icon" onClick={togglePlayback} aria-label={isPlaying ? 'Pause video' : 'Play video'}>{isPlaying ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}</button><span className="yb-player-time">{formatTime(currentTime)}</span><input className="yb-player-range yb-player-progress" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(Number(event.target.value))} aria-label="Video progress" /><span className="yb-player-time">{formatTime(duration)}</span><button type="button" className="yb-player-icon" onClick={toggleMute} aria-label={volume === 0 ? 'Unmute video' : 'Mute video'}>{volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button><input className="yb-player-range yb-volume-range" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => updateVolume(Number(event.target.value))} aria-label="Video volume" /><select className="yb-player-speed" value={playbackRate} onChange={(event) => { const rate = Number(event.target.value); setPlaybackRate(rate); if (videoRef.current) videoRef.current.playbackRate = rate; }} aria-label="Playback speed"><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select><button type="button" className="yb-player-icon" onClick={toggleFullscreen} aria-label="Toggle fullscreen"><Maximize2 className="size-4" /></button></div> : null}
            {objectUrl && !isVideo ? <div className="yb-image-controls" aria-label="Image controls"><button type="button" className="yb-player-icon" onClick={() => setImageScale((scale) => Math.max(.5, scale - .25))} aria-label="Zoom out"><ZoomOut className="size-4" /></button><span>{Math.round(imageScale * 100)}%</span><button type="button" className="yb-player-icon" onClick={() => setImageScale((scale) => Math.min(3, scale + .25))} aria-label="Zoom in"><ZoomIn className="size-4" /></button><button type="button" className="yb-player-icon" onClick={() => setImageRotation((rotation) => rotation - 90)} aria-label="Rotate image left"><RotateCcw className="size-4" /></button><button type="button" className="yb-player-icon" onClick={() => setImageRotation((rotation) => rotation + 90)} aria-label="Rotate image right"><RotateCw className="size-4" /></button><button type="button" className="yb-player-icon" onClick={() => { setImageScale(1); setImageRotation(0); }} aria-label="Reset image view"><RotateCcw className="size-4" /></button></div> : null}
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
