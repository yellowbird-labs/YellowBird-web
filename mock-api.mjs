// Minimal stand-in for the Yellowbird API so the UI can be reviewed without the backend.
// Usage: node mock-api.mjs  (port 4310; NEXT_PUBLIC_API_URL=http://localhost:4310)
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const port = Number(process.argv[2] || 4310);
const projects = [
  { id: 'p-demo', owner_id: 'u-demo', name: 'Client films', description: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];
const mediaById = new Map();
const jobsByMedia = new Map();
const renditionsByMedia = new Map();

const MEDIA_DIR = path.resolve('.mock-media');
const VIDEO_URL = `http://localhost:${port}/media/sample.mp4`;
const POSTER_URL = `http://localhost:${port}/media/poster.jpg`;

const json = (res, code, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': '*',
  });
  res.end(body);
};

function makeMedia(projectId, name) {
  const id = randomUUID();
  const media = { id, project_id: projectId, original_file_name: name, mime_type: 'video/mp4', size: 4_820_000, status: 'uploaded', duration_seconds: 15, width: 1280, height: 720 };
  mediaById.set(id, media);
  jobsByMedia.set(id, [
    { id: randomUUID(), media_id: id, type: 'thumbnail', target_height: null, status: 'queued', progress: 0 },
    { id: randomUUID(), media_id: id, type: 'preview', target_height: null, status: 'queued', progress: 0 },
    { id: randomUUID(), media_id: id, type: 'transcode', target_height: 1080, status: 'queued', progress: 0 },
    { id: randomUUID(), media_id: id, type: 'transcode', target_height: 720, status: 'queued', progress: 0 },
    { id: randomUUID(), media_id: id, type: 'transcode', target_height: 360, status: 'queued', progress: 0 },
  ]);
  renditionsByMedia.set(id, []);
  return media;
}

function tick(id) {
  const media = mediaById.get(id);
  if (!media) return false;
  const jobs = jobsByMedia.get(id) ?? [];
  const renditions = renditionsByMedia.get(id) ?? [];
  let changed = false;
  for (const job of jobs) {
    if (job.status === 'queued') { job.status = 'running'; changed = true; }
    else if (job.status === 'running') {
      job.progress = Math.min(100, job.progress + 12 + Math.round(Math.random() * 14));
      changed = true;
      if (job.progress >= 100) {
        job.status = 'completed';
        const done = renditions.some((r) => r.type === job.type && r.target_height === job.target_height);
        if (!done) {
          const isVideo = job.type === 'transcode' || job.type === 'preview';
          renditions.push({
            id: randomUUID(),
            media_id: id,
            type: job.type,
            url: isVideo ? VIDEO_URL : POSTER_URL,
            mime_type: isVideo ? 'video/mp4' : 'image/jpeg',
            size: 1_640_000,
            width: 1280,
            height: job.target_height ?? 720,
            duration_seconds: 15,
          });
        }
      }
    }
  }
  const allDone = jobs.length > 0 && jobs.every((job) => job.status === 'completed');
  if (media.status !== 'ready' && allDone) media.status = 'ready';
  else if (media.status !== 'ready') media.status = 'processing';
  return changed;
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const send = (code, payload) => json(res, code, payload);
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }); res.end(); return; }
  try {
    if (url.pathname === '/api/v1/users/register' && req.method === 'POST') {
      let raw = ''; req.on('data', (c) => { raw += c; }); req.on('end', () => {
        const body = JSON.parse(raw || '{}');
        const now = new Date().toISOString();
        send(201, { id: randomUUID(), name: body.name || 'New user', email: body.email || '', created_at: now, updated_at: now });
      }); return;
    }
    if (url.pathname === '/api/v1/users/login' && req.method === 'POST') {
      let raw = ''; req.on('data', (c) => { raw += c; }); req.on('end', () => {
        const body = JSON.parse(raw || '{}');
        // JWT-shaped token the client's expiry check can parse: header.payload.signature
        const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
        const token = `mock.${Buffer.from(JSON.stringify({ exp })).toString('base64')}.sig`;
        const now = new Date().toISOString();
        send(200, { token, user: { id: 'u-mock', name: body.email ? body.email.split('@')[0] : 'Yellowbird user', email: body.email || 'you@studio.com', created_at: now, updated_at: now } });
      }); return;
    }
    if (url.pathname === '/api/v1/projects' && req.method === 'GET') return void send(200, projects);
    if (url.pathname === '/api/v1/projects' && req.method === 'POST') {
      let raw = ''; req.on('data', (c) => { raw += c; }); req.on('end', () => {
        const body = JSON.parse(raw || '{}');
        const project = { id: randomUUID(), owner_id: 'u-demo', name: body.name || 'Untitled', description: body.description || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        projects.unshift(project); send(201, project);
      }); return;
    }
    if (url.pathname === '/api/v1/media' && req.method === 'POST') {
      // Consume upload chunks, acknowledge with a new media row.
      let size = 0; req.on('data', (c) => { size += c.length; }); req.on('end', () => {
        void size;
        const media = makeMedia('p-demo', 'ForBiggerBlazes.mp4');
        send(201, media);
      }); return;
    }
    const match = url.pathname.match(/^\/api\/v1\/media\/([^/]+)$/);
    if (match && req.method === 'GET') { const id = match[1]; tick(id); const media = mediaById.get(id); return void (media ? send(200, media) : send(404, { error: 'not found' })); }
    const jobsMatch = url.pathname.match(/^\/api\/v1\/jobs$/);
    if (jobsMatch && req.method === 'GET') { const id = url.searchParams.get('media_id'); tick(id); return void send(200, jobsByMedia.get(id) ?? []); }
    const rendMatch = url.pathname.match(/^\/api\/v1\/renditions$/);
    if (rendMatch && req.method === 'GET') { const id = url.searchParams.get('media_id'); void tick(id); return void send(200, renditionsByMedia.get(id) ?? []); }
    if (url.pathname.startsWith('/media/')) {
      const file = path.join(MEDIA_DIR, path.basename(url.pathname));
      if (!fs.existsSync(file)) { send(404, { error: 'no such media' }); return; }
      const ext = path.extname(file);
      const type = ext === '.mp4' ? 'video/mp4' : 'image/jpeg';
      const size = fs.statSync(file).size;
      const range = req.headers.range;
      if (range) {
        const match = range.match(/bytes=(\d*)-(\d*)/);
        let start = match && match[1] ? Number(match[1]) : 0;
        let end = match && match[2] ? Number(match[2]) : size - 1;
        if (Number.isNaN(start) || start >= size) start = 0;
        if (Number.isNaN(end) || end >= size) end = size - 1;
        res.writeHead(206, {
          'Content-Type': type,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(file).pipe(res);
      }
      return;
    }
    send(404, { error: `No route for ${req.method} ${url.pathname}` });
  } catch (error) {
    send(500, { error: error instanceof Error ? error.message : 'mock failure' });
  }
});

const publicDir = path.resolve('public');
// Allow serving any local files for rendition URLs by mapping ?local=1 to /public paths.
server.on('request', (req) => { req.url = req.url.replace('local=1', ''); void req; void publicDir; });

server.listen(port, () => console.log(`mock api on http://localhost:${port}`));
