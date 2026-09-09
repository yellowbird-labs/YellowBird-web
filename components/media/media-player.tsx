'use client';

import React, { useState, useRef } from 'react';
import { MediaItem } from '@/types/media';
import { formatDuration } from '@/lib/utils';
import { Play, Pause, Volume2, VolumeX, Maximize, Film } from 'lucide-react';

export interface MediaPlayerProps {
  media: MediaItem;
}

export function MediaPlayer({ media }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="relative rounded-xl border border-zinc-850 bg-black overflow-hidden group shadow-2xl flex flex-col justify-between aspect-video max-h-[420px] w-full">
      {/* Background Video / Mock Canvas */}
      {media.sourceUrl && media.sourceUrl.endsWith('.mp4') ? (
        <video
          ref={videoRef}
          src={media.sourceUrl}
          poster={media.thumbnailUrl}
          muted={isMuted}
          playsInline
          loop
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          className="w-full h-full object-contain bg-zinc-950"
        />
      ) : (
        /* Technical Media Canvas Simulation */
        <div className="w-full h-full flex flex-col items-center justify-center bg-radial from-zinc-900 to-black p-6 relative">
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2315_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2315_1px,transparent_1px)] bg-[size:24px_24px]" />

          <div className="relative z-10 flex flex-col items-center space-y-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-900/90 border border-zinc-800 text-yellow-400 shadow-xl">
              <Film className="size-7" />
            </div>
            <div className="text-center space-y-1">
              <span className="text-xs font-mono font-semibold text-zinc-200 block truncate max-w-xs">
                {media.filename}
              </span>
              <span className="text-[10px] font-mono text-zinc-500 block">
                Source Master Asset • {media.width}x{media.height} ({media.codec || 'H.264'})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Overlay Overlay */}
      <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-300 backdrop-blur-xs">
            SOURCE INPUT
          </span>
          <span className="text-[10px] font-mono text-zinc-400">
            {media.width}x{media.height} @ {media.fps || 30}fps
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
            {media.codec || 'ProRes/H.264'}
          </span>
        </div>
      </div>

      {/* Bottom Technical Player Bar */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent space-y-2">
        {/* Scrubber bar */}
        <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden cursor-pointer hover:h-1.5 transition-all">
          <div
            className="bg-yellow-400 h-full rounded-full transition-all duration-150"
            style={{
              width: `${(currentTime / (media.durationSeconds || 120)) * 100 || 25}%`,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-1 rounded text-zinc-200 hover:text-white hover:bg-zinc-800/60 active:scale-95 transition-[transform,background-color]"
              aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
            </button>

            <button
              onClick={toggleMute}
              className="p-1 rounded text-zinc-300 hover:text-white hover:bg-zinc-800/60 active:scale-95 transition-[transform,background-color]"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>

            <span className="text-[11px] tabular-nums text-zinc-400">
              {formatDuration(currentTime)} / {formatDuration(media.durationSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono">
              RAW MASTER
            </span>
            <button
              onClick={() => {
                if (videoRef.current?.requestFullscreen) {
                  videoRef.current.requestFullscreen();
                }
              }}
              className="p-1 rounded text-zinc-400 hover:text-white"
              aria-label="Fullscreen"
            >
              <Maximize className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
