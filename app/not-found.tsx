import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-4 font-mono">
      <div className="flex size-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-yellow-400">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
          404 — Route Not Found
        </h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          The requested media resource, job trace, or project workspace does not exist.
        </p>
      </div>
      <Link href="/">
        <Button variant="outline" size="sm" className="font-mono text-xs">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
