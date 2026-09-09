'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Project } from '@/types/projects';
import { uploadMockMedia } from '@/lib/api/media';
import { UploadCloud, Film, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface MediaUploadModalProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  defaultProjectId?: string;
}

export function MediaUploadModal({
  open,
  onClose,
  projects,
  defaultProjectId,
}: MediaUploadModalProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '');
  const [selectedFilename, setSelectedFilename] = useState('');
  const [fileSize, setFileSize] = useState<number>(145000000);
  const [isUploading, setIsUploading] = useState(false);

  const presetSamples = [
    { name: '4k-commercial-master-edit.mov', size: 450000000, type: 'video/quicktime' },
    { name: 'developer-keynote-hls-demo.mp4', size: 128000000, type: 'video/mp4' },
    { name: 'product-feature-walkthrough.mp4', size: 84000000, type: 'video/mp4' },
  ];

  const handleSelectPreset = (sample: { name: string; size: number; type: string }) => {
    setSelectedFilename(sample.name);
    setFileSize(sample.size);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFilename) return;

    setIsUploading(true);
    try {
      const media = await uploadMockMedia(
        {
          name: selectedFilename,
          size: fileSize,
          type: selectedFilename.endsWith('.mov') ? 'video/quicktime' : 'video/mp4',
        },
        projectId
      );

      onClose();
      router.push(`/media/${media.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="INGEST MEDIA ASSET"
      description="Upload raw video for distributed transcoding across 5 rendition profiles"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
        {/* Project Target */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
            Target Project Workspace
          </label>
          <Select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.slug})
              </option>
            ))}
          </Select>
        </div>

        {/* Upload Dropzone / Preset Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-zinc-400 uppercase tracking-wider block">
            Select Video Asset
          </label>

          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-5 text-center space-y-3">
            <UploadCloud className="size-7 text-yellow-400/80 mx-auto" />
            <div className="space-y-1">
              <p className="text-zinc-200 font-semibold">
                {selectedFilename || 'Pick a benchmark sample or custom file'}
              </p>
              <p className="text-[10px] text-zinc-500">
                Supports MP4, MOV, ProRes, H.264 up to 4GB master files
              </p>
            </div>

            {/* Quick Sample Presets */}
            <div className="pt-2 border-t border-zinc-850/80 space-y-1.5">
              <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">
                Quick Pipeline Samples:
              </span>
              <div className="flex flex-col gap-1.5">
                {presetSamples.map((sample) => (
                  <button
                    type="button"
                    key={sample.name}
                    onClick={() => handleSelectPreset(sample)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                      selectedFilename === sample.name
                        ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Film className="size-3.5 shrink-0" />
                      <span className="truncate">{sample.name}</span>
                    </div>
                    {selectedFilename === sample.name ? (
                      <CheckCircle2 className="size-3.5 text-yellow-400 shrink-0" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-850">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            size="sm"
            disabled={!selectedFilename}
            isLoading={isUploading}
          >
            Start Processing Pipeline
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
