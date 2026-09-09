import { MediaItem } from '@/types/media';
import { Job, JobType, RenditionOutput } from '@/types/jobs';

export interface DemoStepEvent {
  stepIndex: number;
  stageName: string;
  activeJobType?: JobType;
  message: string;
  media: MediaItem;
}

export type DemoSubscriber = (event: DemoStepEvent) => void;

export class DemoProcessingStateMachine {
  private media: MediaItem;
  private subscribers: Set<DemoSubscriber> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private step = 0;

  constructor(initialMedia: MediaItem) {
    this.media = JSON.parse(JSON.stringify(initialMedia));
  }

  public subscribe(callback: DemoSubscriber): () => void {
    this.subscribers.add(callback);
    callback({
      stepIndex: this.step,
      stageName: this.getStageName(),
      activeJobType: this.getActiveJobType(),
      message: 'Demo state machine ready',
      media: this.media,
    });
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getCurrentMedia(): MediaItem {
    return this.media;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.resetToQueued();
    this.scheduleNextStep(400);
  }

  public stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public reset(): void {
    this.stop();
    this.resetToQueued();
    this.step = 0;
    this.emit('Reset to initial state');
  }

  private resetToQueued(): void {
    const now = new Date().toISOString();
    this.media.status = 'queued';
    this.media.overallProgressPercent = 0;
    this.media.completedAt = undefined;
    this.media.renditions = [];

    const jobTypes: JobType[] = ['thumbnail', 'preview', '360p', '720p', '1080p'];
    this.media.jobs = [];
    for (let i = 0; i < jobTypes.length; i++) {
      const type = jobTypes[i];
      this.media.jobs.push({
        id: `job_sim_${type}_${Date.now()}`,
        mediaId: this.media.id,
        projectId: this.media.projectId,
        type,
        status: 'queued',
        progressPercent: 0,
        attemptCount: 0,
        maxAttempts: 3,
        createdAt: now,
        attempts: [],
        timeline: [
          {
            id: `ev_init_${type}`,
            stage: 'created',
            label: 'Job created',
            timestamp: now,
          },
          {
            id: `ev_queue_${type}`,
            stage: 'queued',
            label: 'Queued on Redis Stream yellowbird:jobs',
            timestamp: now,
          },
        ],
        input: {
          filename: this.media.filename,
          mediaId: this.media.id,
          sizeBytes: this.media.originalSizeBytes,
          mimeType: this.media.mimeType,
        },
      });
    }
  }

  private scheduleNextStep(delayMs: number): void {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      this.executeNextStep();
    }, delayMs);
  }

  private executeNextStep(): void {
    if (!this.running) return;
    this.step++;
    const now = new Date().toISOString();

    if (this.step === 1) {
      this.media.status = 'processing';
      this.updateJob('thumbnail', {
        status: 'running',
        progressPercent: 40,
        attemptCount: 1,
        workerId: 'worker-01',
        startedAt: now,
      });
      this.addJobTimeline('thumbnail', 'claimed', 'Claimed by worker-01', 'worker-01');
      this.addJobTimeline('thumbnail', 'processing', 'FFmpeg extracting frame 00:00:01.000');
      this.media.overallProgressPercent = 10;
      this.emit('Worker claimed thumbnail job');
      this.scheduleNextStep(1200);
      return;
    }

    if (this.step === 2) {
      const rend: RenditionOutput = {
        jobType: 'thumbnail',
        resolution: '1280x720',
        format: 'image/jpeg',
        fileSizeBytes: 184000,
        url: 'https://res.cloudinary.com/yellowbird-demo/image/upload/v1/samples/keynote-thumb.jpg',
      };
      this.updateJob('thumbnail', {
        status: 'completed',
        progressPercent: 100,
        completedAt: now,
        durationSeconds: 1.2,
        output: rend,
      });
      this.addJobTimeline('thumbnail', 'uploaded', 'Uploaded poster to Cloudinary');
      this.addJobTimeline('thumbnail', 'completed', 'Completed & rendition saved');
      this.media.renditions.push(rend);
      this.media.thumbnailUrl = rend.url;

      this.updateJob('preview', {
        status: 'running',
        progressPercent: 30,
        attemptCount: 1,
        workerId: 'worker-02',
        startedAt: now,
      });
      this.addJobTimeline('preview', 'claimed', 'Claimed by worker-02', 'worker-02');
      this.media.overallProgressPercent = 25;
      this.emit('Thumbnail complete, started animated preview');
      this.scheduleNextStep(1400);
      return;
    }

    if (this.step === 3) {
      const rend: RenditionOutput = {
        jobType: 'preview',
        resolution: '480x270',
        format: 'image/webp',
        fileSizeBytes: 420000,
        url: 'https://res.cloudinary.com/yellowbird-demo/image/upload/v1/samples/keynote-preview.webp',
        durationSeconds: 3.0,
      };
      this.updateJob('preview', {
        status: 'completed',
        progressPercent: 100,
        completedAt: now,
        durationSeconds: 1.4,
        output: rend,
      });
      this.addJobTimeline('preview', 'completed', 'Preview WebP generated and cached');
      this.media.renditions.push(rend);

      this.updateJob('360p', {
        status: 'running',
        progressPercent: 20,
        attemptCount: 1,
        workerId: 'worker-01',
        startedAt: now,
      });
      this.addJobTimeline('360p', 'claimed', 'Claimed by worker-01', 'worker-01');
      this.addJobTimeline('360p', 'processing', 'FFmpeg H.264 640x360 transcode @ 600 kbps');
      this.media.overallProgressPercent = 45;
      this.emit('Preview complete, started 360p transcode');
      this.scheduleNextStep(1600);
      return;
    }

    if (this.step === 4) {
      const rend: RenditionOutput = {
        jobType: '360p',
        resolution: '640x360',
        bitrateKbps: 600,
        format: 'video/mp4',
        fileSizeBytes: 9800000,
        url: 'https://res.cloudinary.com/yellowbird-demo/video/upload/v1/samples/keynote-360p.mp4',
        durationSeconds: this.media.durationSeconds,
        codec: 'h264 / aac',
      };
      this.updateJob('360p', {
        status: 'completed',
        progressPercent: 100,
        completedAt: now,
        durationSeconds: 1.6,
        output: rend,
      });
      this.addJobTimeline('360p', 'completed', '360p rendition published');
      this.media.renditions.push(rend);

      this.updateJob('720p', {
        status: 'running',
        progressPercent: 30,
        attemptCount: 1,
        workerId: 'worker-03',
        startedAt: now,
      });
      this.addJobTimeline('720p', 'claimed', 'Claimed by worker-03', 'worker-03');
      this.addJobTimeline('720p', 'processing', 'FFmpeg H.264 1280x720 2-pass @ 2400 kbps');
      this.media.overallProgressPercent = 70;
      this.emit('360p complete, started 720p HD transcode');
      this.scheduleNextStep(1800);
      return;
    }

    if (this.step === 5) {
      const rend: RenditionOutput = {
        jobType: '720p',
        resolution: '1280x720',
        bitrateKbps: 2400,
        format: 'video/mp4',
        fileSizeBytes: 32400000,
        url: 'https://res.cloudinary.com/yellowbird-demo/video/upload/v1/samples/keynote-720p.mp4',
        durationSeconds: this.media.durationSeconds,
        codec: 'h264 / aac',
      };
      this.updateJob('720p', {
        status: 'completed',
        progressPercent: 100,
        completedAt: now,
        durationSeconds: 1.8,
        output: rend,
      });
      this.addJobTimeline('720p', 'completed', '720p HD rendition published');
      this.media.renditions.push(rend);

      this.updateJob('1080p', {
        status: 'running',
        progressPercent: 25,
        attemptCount: 1,
        workerId: 'worker-01',
        startedAt: now,
      });
      this.addJobTimeline('1080p', 'claimed', 'Claimed by worker-01', 'worker-01');
      this.addJobTimeline('1080p', 'processing', 'FFmpeg High Profile 1080p transcode @ 4800 kbps');
      this.media.overallProgressPercent = 88;
      this.emit('720p complete, started 1080p Full HD transcode');
      this.scheduleNextStep(2000);
      return;
    }

    if (this.step === 6) {
      const rend: RenditionOutput = {
        jobType: '1080p',
        resolution: '1920x1080',
        bitrateKbps: 4800,
        format: 'video/mp4',
        fileSizeBytes: 68400000,
        url: 'https://res.cloudinary.com/yellowbird-demo/video/upload/v1/samples/keynote-1080p.mp4',
        durationSeconds: this.media.durationSeconds,
        codec: 'h264 / aac',
      };
      this.updateJob('1080p', {
        status: 'completed',
        progressPercent: 100,
        completedAt: now,
        durationSeconds: 2.0,
        output: rend,
      });
      this.addJobTimeline('1080p', 'completed', '1080p Master rendition published');
      this.media.renditions.push(rend);

      this.media.status = 'ready';
      this.media.overallProgressPercent = 100;
      this.media.completedAt = now;
      this.running = false;
      this.emit('All 5 processing jobs completed! Media is ready.');
      return;
    }
  }

  private updateJob(type: JobType, updates: Partial<Job>): void {
    for (let i = 0; i < this.media.jobs.length; i++) {
      if (this.media.jobs[i].type === type) {
        this.media.jobs[i] = { ...this.media.jobs[i], ...updates };
        break;
      }
    }
  }

  private addJobTimeline(type: JobType, stage: Job['timeline'][0]['stage'], label: string, workerId?: string): void {
    for (let i = 0; i < this.media.jobs.length; i++) {
      if (this.media.jobs[i].type === type) {
        this.media.jobs[i].timeline.push({
          id: `ev_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          stage,
          label,
          timestamp: new Date().toISOString(),
          workerId,
        });
        break;
      }
    }
  }

  private getStageName(): string {
    if (this.step === 0) return 'QUEUED';
    if (this.step >= 1 && this.step <= 5) return 'WORKER / FFMPEG PROCESSING';
    return 'RENDITIONS READY';
  }

  private getActiveJobType(): JobType | undefined {
    if (this.step === 1) return 'thumbnail';
    if (this.step === 2) return 'preview';
    if (this.step === 3) return '360p';
    if (this.step === 4) return '720p';
    if (this.step === 5) return '1080p';
    return undefined;
  }

  private emit(message: string): void {
    const event: DemoStepEvent = {
      stepIndex: this.step,
      stageName: this.getStageName(),
      activeJobType: this.getActiveJobType(),
      message,
      media: JSON.parse(JSON.stringify(this.media)),
    };
    for (const sub of this.subscribers) {
      sub(event);
    }
  }
}
