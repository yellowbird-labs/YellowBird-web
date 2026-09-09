import { Radio } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-3 p-4">
      <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-yellow-400">
        <Radio className="size-5 animate-pulse" />
      </div>
      <div className="text-center space-y-1">
        <span className="text-xs font-mono font-semibold text-zinc-300 block">
          Connecting to YellowBird Stream Ingest...
        </span>
        <span className="text-[10px] font-mono text-zinc-600 block">
          Syncing worker telemetry and transcode state
        </span>
      </div>
    </div>
  );
}
