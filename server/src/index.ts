import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';
import { generatePreviewHtml } from './pipeline/preview-gen.js';
import { generateStory, generateAutoConfig, isGeminiAvailable } from './gemini.js';

const execFileAsync = promisify(execFile);
const ADB = 'C:\\Users\\bbell\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// ── Active Connections & Builds ──

const clients = new Map<string, WebSocket>();

interface BuildRecord {
  config: unknown;
  status: 'queued' | 'building' | 'complete' | 'error';
  progress: number;
  apkPath?: string;
  previewHtml?: string;
}

const builds = new Map<string, BuildRecord>();

// ── Library Persistence ──

interface LibraryEntry {
  id: string;
  name: string;
  rating: number; // 0-5 stars
  config: unknown;
  buildId: string;
  apkSize: string;
  createdAt: string;
}

const LIBRARY_PATH = join(process.cwd(), 'data', 'library.json');

function loadLibrary(): LibraryEntry[] {
  try {
    if (existsSync(LIBRARY_PATH)) {
      return JSON.parse(readFileSync(LIBRARY_PATH, 'utf-8'));
    }
  } catch { /* corrupted file — start fresh */ }
  return [];
}

function saveLibrary(entries: LibraryEntry[]): void {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(LIBRARY_PATH, JSON.stringify(entries, null, 2));
}

let library = loadLibrary();

// ── WebSocket ──

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const buildId = url.searchParams.get('buildId');
  if (buildId) {
    clients.set(buildId, ws);
    ws.on('close', () => clients.delete(buildId));
  }
});

function sendProgress(buildId: string, data: Record<string, unknown>) {
  const ws = clients.get(buildId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ── Build Pipeline Stages ──

interface PipelineStage {
  id: string;
  name: string;
  percent: number;
  duration: number;
  detail: string;
}

function getPipelineStages(config: Record<string, unknown>): PipelineStage[] {
  const genre = (config.genre as Record<string, string>)?.name ?? 'game';
  const artStyle = (config.artStyle as Record<string, string>)?.name ?? 'art';
  const roomCount = ((config.structure as Record<string, number>)?.roomCount ?? 5);

  return [
    { id: 'init', name: 'Initializing Project', percent: 5, duration: 1200,
      detail: 'Creating project scaffold with Kotlin/Canvas architecture...' },
    { id: 'architecture', name: 'Generating Game Architecture', percent: 12, duration: 1800,
      detail: `Setting up ${genre} framework with BaseRoom, GameView, GameState...` },
    { id: 'rooms', name: `Designing ${roomCount} Room Layouts`, percent: 22, duration: 2500,
      detail: 'Defining normalized coordinate layouts, hotspot regions, examine spots...' },
    { id: 'art_bg', name: 'AI Bridge → Generating Backgrounds', percent: 35, duration: 4000,
      detail: `Sending ${roomCount} background prompts to Gemini in ${artStyle} style...` },
    { id: 'art_items', name: 'AI Bridge → Creating Item Assets', percent: 48, duration: 3500,
      detail: 'Generating inventory item sprites, UI icons, and interactive objects...' },
    { id: 'art_ui', name: 'AI Bridge → Crafting UI Elements', percent: 55, duration: 2500,
      detail: 'Creating bag icon, inventory panel, dialog frames, HUD elements...' },
    { id: 'logic', name: 'Writing Game Logic (Kotlin)', percent: 65, duration: 3000,
      detail: 'Generating room classes, puzzle logic, state transitions, undo system...' },
    { id: 'inventory', name: 'Wiring Inventory & Hotspot Systems', percent: 72, duration: 2000,
      detail: 'Connecting floating bag, item slide-out, hotspot hit-testing, syncHotspots...' },
    { id: 'gradle_setup', name: 'Assembling Android Project', percent: 78, duration: 2000,
      detail: 'Generating build.gradle.kts, AndroidManifest.xml, Gradle wrapper...' },
    { id: 'gradle_build', name: 'Building APK with Gradle', percent: 90, duration: 5000,
      detail: 'Running :app:assembleDebug via standalone Gradle 8.1.1...' },
    { id: 'signing', name: 'Signing APK', percent: 95, duration: 1500,
      detail: 'Applying debug signature to APK package...' },
    { id: 'complete', name: 'Build Complete!', percent: 100, duration: 500,
      detail: 'Your game is ready to deploy!' },
  ];
}

// ── API Routes ──

// Start a build
app.post('/api/forge', async (req, res) => {
  const config = req.body;
  const buildId = uuidv4();

  builds.set(buildId, { config, status: 'queued', progress: 0 });
  res.json({ buildId });

  // Wait for WebSocket connection before starting pipeline
  waitForClient(buildId, 5000).then(() => runPipeline(buildId, config));
});

// Get build status
app.get('/api/status/:buildId', (req, res) => {
  const build = builds.get(req.params.buildId);
  if (!build) {
    res.status(404).json({ error: 'Build not found' });
    return;
  }
  res.json(build);
});

// Check connected ADB devices
app.get('/api/devices', async (_req, res) => {
  try {
    const { stdout } = await execFileAsync(ADB, ['devices', '-l']);
    const lines = stdout.trim().split('\n').slice(1); // skip header
    const devices = lines
      .filter((l) => l.includes('device'))
      .map((l) => {
        const parts = l.trim().split(/\s+/);
        const serial = parts[0];
        const model = parts.find((p) => p.startsWith('model:'))?.split(':')[1] ?? 'Unknown';
        return { serial, model };
      });
    res.json({ devices });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.json({
      devices: [],
      hint: `ADB error: ${msg}. Make sure USB debugging is enabled.`,
    });
  }
});

// Deploy APK to device
app.post('/api/deploy', async (req, res) => {
  const { buildId, serial } = req.body;
  const build = builds.get(buildId);
  if (!build || !build.apkPath) {
    res.status(400).json({ error: 'Build not found or not complete' });
    return;
  }

  try {
    // Install APK  (allow downgrade with -d, grant permissions with -g)
    const installArgs = ['install', '-g', '-r', build.apkPath];
    if (serial) installArgs.unshift('-s', serial);
    await execFileAsync(ADB, installArgs, { timeout: 120000 });

    // Launch the app
    const launchArgs = ['shell', 'am', 'start', '-W', '-n', 'com.bellforge.game/.MainActivity'];
    if (serial) launchArgs.unshift('-s', serial);
    await execFileAsync(ADB, launchArgs, { timeout: 15000 });

    res.json({
      success: true,
      message: 'APK installed and launched on your device!',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Deploy failed: ${msg}` });
  }
});

// Serve the in-browser game preview
app.get('/api/preview/:buildId', (req, res) => {
  const build = builds.get(req.params.buildId);
  if (!build || !build.previewHtml) {
    res.status(404).json({ error: 'Preview not found' });
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(build.previewHtml);
});

// ── Gemini Creative Endpoints ──

// Generate a story via Gemini (or curated fallback)
app.post('/api/gemini/story', async (req, res) => {
  const { genreHint, themeHint } = req.body || {};
  try {
    const story = await generateStory(genreHint, themeHint);
    res.json({ story, gemini: isGeminiAvailable() });
  } catch {
    res.status(500).json({ error: 'Story generation failed' });
  }
});

// Generate a full auto-config via Gemini (for "Forge For Me")
app.post('/api/gemini/auto-config', async (_req, res) => {
  try {
    const config = await generateAutoConfig();
    res.json({ config, gemini: isGeminiAvailable() });
  } catch {
    res.status(500).json({ error: 'Auto-config generation failed' });
  }
});

// ── Library Endpoints ──

// List all saved games
app.get('/api/library', (_req, res) => {
  res.json({ entries: library });
});

// Save a game to library
app.post('/api/library', (req, res) => {
  const { buildId, name } = req.body;
  const build = builds.get(buildId);
  if (!build || build.status !== 'complete') {
    res.status(400).json({ error: 'Build not found or not complete' });
    return;
  }

  // Prevent duplicate saves of the same build
  if (library.some((e) => e.buildId === buildId)) {
    res.json({ entry: library.find((e) => e.buildId === buildId)! });
    return;
  }

  const entry: LibraryEntry = {
    id: uuidv4(),
    name: name || (build.config as Record<string, Record<string, string>>)?.story?.title || 'Untitled Game',
    rating: 0,
    config: build.config,
    buildId,
    apkSize: build.apkPath ? '~10 MB' : '0',
    createdAt: new Date().toISOString(),
  };

  library.push(entry);
  saveLibrary(library);
  res.json({ entry });
});

// Update a library entry (name, rating)
app.patch('/api/library/:id', (req, res) => {
  const entry = library.find((e) => e.id === req.params.id);
  if (!entry) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  if (req.body.name !== undefined) entry.name = String(req.body.name).slice(0, 100);
  if (req.body.rating !== undefined) {
    const r = Number(req.body.rating);
    if (r >= 0 && r <= 5) entry.rating = r;
  }

  saveLibrary(library);
  res.json({ entry });
});

// Delete a library entry
app.delete('/api/library/:id', (req, res) => {
  const idx = library.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }
  library.splice(idx, 1);
  saveLibrary(library);
  res.json({ success: true });
});

// Download the preview HTML for a library entry
app.get('/api/library/:id/download', (req, res) => {
  const entry = library.find((e) => e.id === req.params.id);
  if (!entry) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  const build = builds.get(entry.buildId);
  if (!build || !build.previewHtml) {
    res.status(404).json({ error: 'Preview no longer available (server restarted). Re-forge this game to make it downloadable again.' });
    return;
  }

  const safeName = entry.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.html"`);
  res.send(build.previewHtml);
});

// ── Pipeline Execution ──

async function runPipeline(buildId: string, config: Record<string, unknown>) {
  const record = builds.get(buildId)!;
  record.status = 'building';

  const stages = getPipelineStages(config);

  for (const stage of stages) {
    sendProgress(buildId, {
      type: 'progress',
      stage: stage.id,
      name: stage.name,
      percent: stage.percent,
      detail: stage.detail,
      timestamp: Date.now(),
    });

    // Simulate real work — in production, each stage calls real generators
    await sleep(stage.duration);
  }

  const title = (config.story as Record<string, string>)?.title || 'MyGame';
  const safeName = title.replace(/[^a-zA-Z0-9]/g, '_');
  const apkPath = `C:\\Stuff\\BellForge\\output\\${safeName}\\app-debug.apk`;

  // Generate the in-browser preview with a unique seed
  const buildSeed = Date.now() ^ Math.floor(Math.random() * 0x7fffffff);
  const previewHtml = generatePreviewHtml({
    genre: config.genre as { id: string; name: string },
    theme: config.theme as { id: string; name: string },
    artStyle: config.artStyle as { id: string; name: string },
    structure: config.structure as { roomCount: number; difficulty: string; puzzleDensity: string },
    story: config.story as { title: string; description: string; characterName: string; setting: string },
    seed: buildSeed,
  });

  record.status = 'complete';
  record.progress = 100;
  record.apkPath = apkPath;
  record.previewHtml = previewHtml;

  sendProgress(buildId, {
    type: 'complete',
    percent: 100,
    apkPath,
    apkSize: `${(8 + Math.random() * 12).toFixed(1)} MB`,
    previewUrl: `/api/preview/${buildId}`,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForClient(buildId: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (clients.has(buildId)) {
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        resolve(); // proceed anyway after timeout
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// ── Start Server ──

const PORT = 3001;
server.listen(PORT, () => {
  console.log('');
  console.log('  ⚒️  ════════════════════════════════════════');
  console.log('  ⚒️   B E L L F O R G E   S E R V E R');
  console.log('  ⚒️  ════════════════════════════════════════');
  console.log(`  ⚒️   HTTP  → http://localhost:${PORT}`);
  console.log(`  ⚒️   WS    → ws://localhost:${PORT}/ws`);
  console.log('  ⚒️  ════════════════════════════════════════');
  console.log('');
});
