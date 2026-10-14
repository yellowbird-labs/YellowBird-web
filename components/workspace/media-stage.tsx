'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Upload, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react';

type MediaStageProps = {
  file?: File | null;
  fileName?: string | null;
  activeMediaUrl: string | null;
  isVideo: boolean;
  posterUrl?: string | null;
  isDragging: boolean;
  statusChip: ReactNode | null;
  onDragEnter: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onBrowse: () => void;
};

const SEEK_STEP = 10;
const ARROW_STEP = 5;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const whole = Math.floor(seconds);
  const hrs = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const mm = hrs > 0 ? String(mins).padStart(2, '0') : String(mins);
  return `${hrs > 0 ? `${hrs}:` : ''}${mm}:${String(secs).padStart(2, '0')}`;
}

/** Pointer-captured 1:1 slider used for both the timeline and volume. */
function Slider({
  value, max, ariaLabel, onSeek, className, trackClass, fillClass, bufferedRatio,
}: {
  value: number;
  max: number;
  ariaLabel: string;
  onSeek: (value: number) => void;
  className?: string;
  trackClass: string;
  fillClass: string;
  bufferedRatio?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  const valueAt = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return pct * max;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setScrubbing(true);
    onSeek(valueAt(event.clientX));
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbing) return;
    onSeek(valueAt(event.clientX));
  };
  const endScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbing) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setScrubbing(false);
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = max * 0.05;
    if (event.key === 'ArrowRight') { event.preventDefault(); onSeek(Math.min(max, value + step)); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); onSeek(Math.max(0, value - step)); }
    if (event.key === 'Home') { event.preventDefault(); onSeek(0); }
    if (event.key === 'End') { event.preventDefault(); onSeek(max); }
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      className={`${className ?? ''} ${scrubbing ? 'is-scrubbing' : ''}`}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.round(max * 100) / 100}
      aria-valuenow={Math.round(value * 100) / 100}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endScrub}
      onPointerCancel={endScrub}
      onKeyDown={onKeyDown}
    >
      <div className={trackClass}>
        {bufferedRatio !== undefined && bufferedRatio > 0 ? <span className="yb-timeline-buffer" style={{ width: `${Math.min(100, bufferedRatio * 100)}%` }} /> : null}
        <span className={fillClass} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className={className?.includes('yb-volume') ? 'yb-volume-thumb' : 'yb-timeline-thumb'} style={{ left: `${ratio * 100}%` }} />
    </div>
  );
}

export default function MediaStage({
  file, fileName, activeMediaUrl, isVideo, posterUrl, isDragging, statusChip,
  onDragEnter, onDragOver, onDragLeave, onDrop, onBrowse,
}: MediaStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const idleTimer = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedRatio, setBufferedRatio] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsIdle, setControlsIdle] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const hasMedia = Boolean(activeMediaUrl);
  const hasVideo = Boolean(activeMediaUrl && isVideo);
  const hasImage = Boolean(activeMediaUrl && !isVideo);
  const displayName = fileName || file?.name || 'Source';

  const [prevMediaUrl, setPrevMediaUrl] = useState(activeMediaUrl);
  const [prevIsVideo, setPrevIsVideo] = useState(isVideo);
  if (prevMediaUrl !== activeMediaUrl || prevIsVideo !== isVideo) {
    setPrevMediaUrl(activeMediaUrl);
    setPrevIsVideo(isVideo);
    setImageScale(1);
    setImageRotation(0);
    setCurrentTime(0);
    setBufferedRatio(0);
    setIsPlaying(false);
  }

  const togglePlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try { await video.play(); } catch { /* autoplay refusal — the big button still works */ }
    } else {
      video.pause();
    }
  }, []);

  const seekTo = useCallback((next: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(next)) return;
    const clamped = Math.min(video.duration || 0, Math.max(0, next));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const skipBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    seekTo(video.currentTime + delta);
  }, [seekTo]);

  const applyVolume = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    setVolume(clamped);
    setMuted(clamped === 0);
    const video = videoRef.current;
    if (video) { video.volume = clamped; video.muted = clamped === 0; }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted && video.volume === 0) applyVolume(0.6);
  }, [applyVolume]);

  // YouTube muscle memory: j / k / l / m, arrows for fine control.
  useEffect(() => {
    if (!hasVideo) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      switch (event.key.toLowerCase()) {
        case 'j': skipBy(-SEEK_STEP); break;
        case 'l': skipBy(SEEK_STEP); break;
        case 'k': event.preventDefault(); void togglePlayback(); break;
        case 'm': toggleMute(); break;
        case ' ': event.preventDefault(); void togglePlayback(); break;
        case 'arrowleft': skipBy(-ARROW_STEP); break;
        case 'arrowright': skipBy(ARROW_STEP); break;
        case 'arrowup': event.preventDefault(); applyVolume((muted ? 0 : volume) + 0.1); break;
        case 'arrowdown': event.preventDefault(); applyVolume((muted ? 0 : volume) - 0.1); break;
        default: return;
      }
      setControlsIdle(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyVolume, hasVideo, muted, skipBy, toggleMute, togglePlayback, volume]);

  const toggleFullscreen = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.requestFullscreen();
    } catch { /* refusal is fine */ }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // hide controls after a beat of stillness while playing
  const wakeControls = useCallback(() => {
    setControlsIdle(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsIdle(true);
    }, 2600);
  }, []);

  useEffect(() => () => { if (idleTimer.current) window.clearTimeout(idleTimer.current); }, []);

  const onPlayStarted = useCallback(() => {
    setIsPlaying(true);
    wakeControls();
  }, [wakeControls]);

  const onPlaybackPaused = useCallback(() => {
    setIsPlaying(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    setControlsIdle(false);
  }, []);

  // controls hide only while playing and the pointer has been still
  const controlsHidden = isPlaying && controlsIdle;

  const stageClass = `yb-media-stage${isDragging ? ' is-dragging' : ''}${hasMedia ? ' has-media' : ''}${controlsHidden ? ' is-idle' : ''}`;

  return (
    <div
      ref={stageRef}
      className={stageClass}
      onDragEnter={(event) => { event.preventDefault(); onDragEnter(); }}
      onDragOver={onDragOver}
      onDragLeave={(event) => { if (event.currentTarget === event.target) onDragLeave(); }}
      onDrop={onDrop}
      onPointerMove={hasVideo ? wakeControls : undefined}
    >
      {hasVideo && activeMediaUrl ? (
        <video
          key={activeMediaUrl}
          ref={videoRef}
          src={activeMediaUrl}
          poster={posterUrl ?? undefined}
          className="yb-media-content is-video"
          preload="metadata"
          playsInline
          aria-label={`${displayName} preview`}
          onClick={togglePlayback}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setDuration(video.duration);
            video.volume = volume; video.muted = muted; video.playbackRate = playbackRate;
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onProgress={(event) => {
            const video = event.currentTarget;
            if (video.buffered.length && video.duration > 0) setBufferedRatio(video.buffered.end(video.buffered.length - 1) / video.duration);
          }}
          onPlay={onPlayStarted}
          onPause={onPlaybackPaused}
          onEnded={onPlaybackPaused}
          onError={() => setIsPlaying(false)}
        />
      ) : null}

      {hasImage && activeMediaUrl ? (
        <img
          key={activeMediaUrl}
          src={activeMediaUrl}
          alt={`${displayName} preview`}
          className="yb-media-content yb-image-content"
          style={{ transform: `scale(${imageScale}) rotate(${imageRotation}deg)` }}
        />
      ) : null}

      {!hasMedia ? (
        <div className="yb-drop-state">
          <div className="yb-drop-icon"><Upload className="size-5" aria-hidden /></div>
          <strong>{isDragging ? 'Release to upload' : 'Drop media here'}</strong>
          <span>Video or image · up to 2GB</span>
          <button type="button" className="yb-drop-browse" onClick={onBrowse}>Browse files</button>
        </div>
      ) : null}

      {isDragging ? <div className="yb-drag-overlay"><Upload className="size-6" aria-hidden /><span>Release to add source</span></div> : null}
      {statusChip}

      {hasVideo && !isPlaying ? (
        <button type="button" className="yb-center-play" onClick={togglePlayback} aria-label="Play video" title="Play (k)">
          <Play className="size-5" fill="currentColor" aria-hidden />
        </button>
      ) : null}

      {hasVideo ? (
        <div className="yb-player-bar" aria-label="Video controls" style={controlsHidden ? { opacity: 0, pointerEvents: 'none' } : undefined}>
          <button type="button" className="yb-player-icon is-emphasis" onClick={togglePlayback} aria-label={isPlaying ? 'Pause video' : 'Play video'} title={isPlaying ? 'Pause (k)' : 'Play (k)'}>
            {isPlaying ? <Pause className="size-4" fill="currentColor" aria-hidden /> : <Play className="size-4" fill="currentColor" aria-hidden />}
          </button>
          <span className="yb-player-time">{formatTime(currentTime)}</span>
          <Slider
            className="yb-timeline"
            trackClass="yb-timeline-track"
            fillClass="yb-timeline-fill"
            ariaLabel="Video timeline"
            value={Math.min(currentTime, duration || 0)}
            max={duration || 0}
            bufferedRatio={bufferedRatio}
            onSeek={seekTo}
          />
          <span className="yb-player-time">{formatTime(duration)}</span>
          <button type="button" className="yb-player-icon" onClick={toggleMute} aria-label={muted || volume === 0 ? 'Unmute video' : 'Mute video'} title={muted ? 'Unmute (m)' : 'Mute (m)'}>
            {muted || volume === 0 ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
          </button>
          <Slider
            className="yb-volume"
            trackClass="yb-volume-track"
            fillClass="yb-volume-fill"
            ariaLabel="Video volume"
            value={muted ? 0 : volume}
            max={1}
            onSeek={applyVolume}
          />
          <select
            className="yb-player-speed"
            value={playbackRate}
            onChange={(event) => {
              const rate = Number(event.target.value);
              setPlaybackRate(rate);
              if (videoRef.current) videoRef.current.playbackRate = rate;
            }}
            aria-label="Playback speed"
          >
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>
          <button type="button" className="yb-player-icon" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title="Fullscreen">
            {isFullscreen ? <Minimize className="size-4" aria-hidden /> : <Maximize className="size-4" aria-hidden />}
          </button>
        </div>
      ) : null}

      {hasImage ? (
        <div className="yb-image-bar" aria-label="Image controls">
          <button type="button" className="yb-player-icon" onClick={() => setImageScale((scale) => Math.max(0.5, scale - 0.25))} aria-label="Zoom out"><ZoomOut className="size-4" aria-hidden /></button>
          <span>{Math.round(imageScale * 100)}%</span>
          <button type="button" className="yb-player-icon" onClick={() => setImageScale((scale) => Math.min(3, scale + 0.25))} aria-label="Zoom in"><ZoomIn className="size-4" aria-hidden /></button>
          <button type="button" className="yb-player-icon" onClick={() => setImageRotation((rotation) => rotation - 90)} aria-label="Rotate left"><RotateCcw className="size-4" aria-hidden /></button>
          <button type="button" className="yb-player-icon" onClick={() => setImageRotation((rotation) => rotation + 90)} aria-label="Rotate right"><RotateCw className="size-4" aria-hidden /></button>
          <button type="button" className="yb-player-icon" onClick={() => { setImageScale(1); setImageRotation(0); }} aria-label="Reset view"><RotateCcw className="size-4" aria-hidden /></button>
        </div>
      ) : null}

      {hasMedia && displayName ? <div className="yb-stage-caption">{displayName}</div> : null}
    </div>
  );
}

// — The framed screen: dark cinema surface, glass controls, YT shortcuts.
