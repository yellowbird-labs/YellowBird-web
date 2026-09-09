'use client';

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronRight, FileImage, FileVideo, ImagePlus, LoaderCircle, Play, Upload, X } from 'lucide-react';
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
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [renditions, setRenditions] = useState<Rendition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    toast('Workspace cleared', { description: 'Drop a new source to begin again.' });
  };

  const statusLabel = useMemo(() => {
    if (error) return 'Needs attention';
    if (isProcessing) return readyRenditions.length ? `${readyRenditions.length} renditions ready` : 'Processing source';
    if (file) return 'Ready to preview';
    return 'Waiting for source';
  }, [error, file, isProcessing, readyRenditions.length]);

  return (
    <main className="yb-shell">
      <header className="yb-topbar">
        <Link href="/" className="yb-brand" aria-label="Yellowbird home"><span className="yb-brand-mark">Y</span><span>yellowbird</span></Link>
        <div className="yb-topbar-center"><span className="yb-live-dot" /> Processing workspace <span className="yb-slash">/</span> local preview</div>
        <div className="yb-topbar-actions"><span className="yb-topbar-status"><span /> Engine online</span><button className="yb-help-button" aria-label="Help">?</button></div>
      </header>

      <section className="yb-workspace-header"><div><p className="yb-kicker">New workspace</p><h1>Media, made tangible.</h1><p className="yb-subtitle">Drop a source in. We&apos;ll shape the outputs.</p></div><div className="yb-header-meta"><span>01</span><span className="yb-meta-line" /><span>Source → renditions</span></div></section>

      <section className="yb-workbench">
        <div className="yb-board-shell">
          <div className="yb-screw yb-screw-left" aria-hidden="true"><i /><i /><i /></div><div className="yb-screw yb-screw-right" aria-hidden="true"><i /><i /><i /></div>
          <div className={`yb-media-stage ${isDragging ? 'is-dragging' : ''} ${file ? 'has-media' : ''}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }} onDrop={onDrop}>
            {objectUrl && isVideo ? <video src={objectUrl} controls className="yb-media-content" aria-label={`${file?.name} preview`} /> : null}
            {objectUrl && !isVideo ? <img src={objectUrl} alt={`${file?.name} preview`} className="yb-media-content" /> : null}
            {!file ? <div className="yb-drop-state"><div className="yb-drop-icon"><Upload className="size-5" /></div><strong>{isDragging ? 'Release to upload' : 'Drop media here'}</strong><span>Video or image · up to 2GB</span></div> : null}
            {isDragging ? <div className="yb-drag-overlay"><Upload className="size-6" /><span>Release to add source</span></div> : null}
            {file && isProcessing ? <div className="yb-processing-chip"><LoaderCircle className="size-3.5 animate-spin" /> {statusLabel}</div> : null}
            {file && !isProcessing && !error ? <div className="yb-preview-chip"><Check className="size-3.5" /> {statusLabel}</div> : null}
            <div className="yb-stage-caption"><span>{file ? file.name : 'SOURCE PREVIEW'}</span><span>{file ? (isVideo ? 'VIDEO' : 'IMAGE') : 'READY'}</span></div>
          </div>
          <div className="yb-board-footer"><div className="yb-source-info">{file ? <><span className="yb-file-icon">{isVideo ? <FileVideo className="size-3.5" /> : <FileImage className="size-3.5" />}</span><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB · {fileKind}</small></span></> : <><span className="yb-file-icon"><ImagePlus className="size-3.5" /></span><span><strong>No source selected</strong><small>Start with a local media file</small></span></>}</div><div className="yb-board-actions"><button className="yb-quiet-button" onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> Upload</button>{file ? <button className="yb-clear-button" onClick={clearWorkspace} aria-label="Clear workspace"><X className="size-3.5" /></button> : null}</div></div>
        </div>

        <aside className="yb-rendition-rail" aria-label="Generated renditions"><div className="yb-rail-heading"><span className="yb-kicker">Outputs</span><span className="yb-count">{readyRenditions.length}/{renditions.length || '—'}</span></div>{readyRenditions.length ? <div className="yb-rendition-list">{readyRenditions.map((rendition) => <button key={rendition.id} className={`yb-rendition-frame ${selectedRendition?.id === rendition.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(rendition.id)}><span className="yb-frame-image">{objectUrl && !isVideo ? <img src={objectUrl} alt="" /> : <span className="yb-frame-bars"><i /><i /><i /></span>}<span className="yb-frame-play">{isVideo ? <Play className="size-3" fill="currentColor" /> : <FileImage className="size-3" />}</span></span><span className="yb-frame-label"><strong>{rendition.label}{!isVideo && 'px'}</strong><small>{rendition.detail}</small></span></button>)}</div> : <div className="yb-rail-empty">{isProcessing ? <><LoaderCircle className="size-4 animate-spin" />Building outputs</> : 'Outputs will appear here'}</div>}</aside>

        <Link href="/library" className="yb-library-preview" aria-label="Open library"><div className="yb-library-heading"><div><span className="yb-kicker">Library preview</span><h2>Generated work</h2></div><span className="yb-library-arrow"><ArrowUpRight className="size-4" /></span></div><div className="yb-card-stack">{readyRenditions.length ? readyRenditions.slice(0, 3).map((rendition, index) => <div className={`yb-stack-card card-${index + 1}`} key={rendition.id}><span className="yb-stack-thumb">{objectUrl && !isVideo ? <img src={objectUrl} alt="" /> : <span className="yb-stack-gradient" />}</span><span className="yb-stack-label"><strong>{rendition.label}{!isVideo && 'px'}</strong><small>{file?.name || 'output'} </small></span></div>) : <div className="yb-stack-empty"><span className="yb-stack-ghost ghost-one" /><span className="yb-stack-ghost ghost-two" /><div><span className="yb-stack-empty-icon"><FileImage className="size-4" /></span><strong>Your outputs live here</strong><small>Generated renditions will collect in the library.</small></div></div>}</div><div className="yb-library-footer"><span>View full library</span><ChevronRight className="size-3.5" /></div></Link>
      </section>

      <footer className="yb-bottom-note"><span><span className="yb-note-dot" /> Drag & drop is active on the preview</span><span className="yb-footer-shortcut"><span>⌘</span><span>O</span> to upload</span></footer>
      <input ref={inputRef} type="file" accept="video/*,image/*" onChange={onFileChange} className="yb-visually-hidden" />
    </main>
  );
}
