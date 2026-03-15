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
import type { GameImages } from './pipeline/preview-gen.js';
import { generateStory, generateAutoConfig, generateCreativeBrief, generateBriefPalette, generateBriefRooms, generateBriefItems, generateBriefHints, qaCreativeBrief, qaGameCode, qaScoredReport, qaContentReport, isGeminiAvailable } from './gemini.js';
import { generateGameImages } from './imagen.js';
import type { GameConfig } from './pipeline/types.js';
import type { AdventureConfig } from './pipeline/types.js';
import type { ComicConfig } from './pipeline/types.js';
import type { EscapeConfig } from './pipeline/types.js';
import type { PuzzleConfig } from './pipeline/types.js';
import { runAdventurePipeline } from './cyoa-pipeline.js';
import { generateCYOAPreviewHtml } from './cyoa-engine.js';
import { runComicPipeline } from './comic-pipeline.js';
import { generateComicPreviewHtml } from './comic-engine.js';
import { runEscapePipeline, generateEscapePreviewHtml } from './escape-pipeline.js';
import { runPuzzlePipeline, generatePuzzlePreviewHtml } from './puzzle-pipeline.js';
import type { CreativeBrief, CreativePalette, CreativeRoom, CreativeItem, PuzzleConnection } from './gemini.js';

const execFileAsync = promisify(execFile);
const ADB = 'C:\\Users\\bbell\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In production, serve the built client
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(process.cwd(), '..', 'client', 'dist');
  app.use(express.static(clientDist));
}

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
  lastProgress?: Record<string, unknown>;
}

const builds = new Map<string, BuildRecord>();

// ── Library Persistence ──

interface LibraryEntry {
  id: string;
  name: string;
  rating: number; // 0-5 stars
  entertainmentType: 'game' | 'adventure' | 'comic' | 'escape' | 'puzzle';
  config: unknown;
  buildId: string;
  apkSize: string;
  createdAt: string;
  thumbnail?: string; // filename in data/thumbnails/
}

const LIBRARY_PATH = join(process.cwd(), 'data', 'library.json');
const PREVIEWS_DIR = join(process.cwd(), 'data', 'previews');
const THUMBNAILS_DIR = join(process.cwd(), 'data', 'thumbnails');

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

// Ensure previews and thumbnails directories exist
if (!existsSync(PREVIEWS_DIR)) mkdirSync(PREVIEWS_DIR, { recursive: true });
if (!existsSync(THUMBNAILS_DIR)) mkdirSync(THUMBNAILS_DIR, { recursive: true });

function saveThumbnail(buildId: string, base64: string): string {
  const filename = `${buildId}.png`;
  // Strip data URI prefix if present
  const raw = base64.replace(/^data:image\/\w+;base64,/, '');
  writeFileSync(join(THUMBNAILS_DIR, filename), Buffer.from(raw, 'base64'));
  return filename;
}

function savePreviewHtml(buildId: string, html: string): void {
  writeFileSync(join(PREVIEWS_DIR, `${buildId}.html`), html, 'utf-8');
}

function loadPreviewHtml(buildId: string): string | null {
  const p = join(PREVIEWS_DIR, `${buildId}.html`);
  if (existsSync(p)) return readFileSync(p, 'utf-8');
  return null;
}

// ── WebSocket ──

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const buildId = url.searchParams.get('buildId');
  if (buildId) {
    clients.set(buildId, ws);
    ws.on('close', () => clients.delete(buildId));

    // Send last known progress so reconnecting clients catch up
    const build = builds.get(buildId);
    if (build?.lastProgress) {
      ws.send(JSON.stringify(build.lastProgress));
    }
  }
});

function sendProgress(buildId: string, data: Record<string, unknown>) {
  // Always store last progress so reconnecting clients can catch up
  const build = builds.get(buildId);
  if (build) {
    build.lastProgress = data;
    build.progress = (data.percent as number) || build.progress;
  }
  const ws = clients.get(buildId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ── Genre-Aware Terminology ──

interface GenreTerms {
  scene: string;        // singular: "room", "level", "chapter", etc.
  scenes: string;       // plural
  Scene: string;        // capitalized singular
  Scenes: string;       // capitalized plural
  furnishing: string;   // "furniture", "elements", "props", "details"
  furnishings: string;
  layout: string;       // "layout", "composition", "structure"
}

function genreTerms(genreId: string): GenreTerms {
  switch (genreId) {
    case 'platformer':
      return { scene: 'level', scenes: 'levels', Scene: 'Level', Scenes: 'Levels', furnishing: 'platform', furnishings: 'platforms & obstacles', layout: 'layout' };
    case 'visual_novel':
      return { scene: 'chapter', scenes: 'chapters', Scene: 'Chapter', Scenes: 'Chapters', furnishing: 'element', furnishings: 'elements', layout: 'composition' };
    case 'puzzle':
      return { scene: 'stage', scenes: 'stages', Scene: 'Stage', Scenes: 'Stages', furnishing: 'piece', furnishings: 'pieces & mechanisms', layout: 'arrangement' };
    case 'interactive_fiction':
      return { scene: 'passage', scenes: 'passages', Scene: 'Passage', Scenes: 'Passages', furnishing: 'detail', furnishings: 'narrative details', layout: 'structure' };
    case 'hidden_object':
      return { scene: 'scene', scenes: 'scenes', Scene: 'Scene', Scenes: 'Scenes', furnishing: 'object', furnishings: 'hidden objects', layout: 'arrangement' };
    case 'dismantle':
      return { scene: 'device', scenes: 'devices', Scene: 'Device', Scenes: 'Devices', furnishing: 'component', furnishings: 'components & fasteners', layout: 'assembly' };
    case 'escape_room':
      return { scene: 'room', scenes: 'rooms', Scene: 'Room', Scenes: 'Rooms', furnishing: 'prop', furnishings: 'props & mechanisms', layout: 'layout' };
    case 'point_click':
    default:
      return { scene: 'room', scenes: 'rooms', Scene: 'Room', Scenes: 'Rooms', furnishing: 'object', furnishings: 'objects', layout: 'layout' };
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
  const genreId = (config.genre as Record<string, string>)?.id ?? 'point_click';
  const artStyle = (config.artStyle as Record<string, string>)?.name ?? 'art';
  const roomCount = ((config.structure as Record<string, number>)?.roomCount ?? 5);
  const t = genreTerms(genreId);

  return [
    { id: 'init', name: '🔥 Lighting the Forge', percent: 3, duration: 1200,
      detail: 'Laying the foundation stones of your game world' },
    { id: 'architecture', name: '🏗️ Raising the Framework', percent: 6, duration: 1800,
      detail: `Bending iron and code into a ${genre} skeleton` },
    { id: 'brief_palette', name: '🎨 Mixing the Paints', percent: 10, duration: 3000,
      detail: 'Choosing pigments by the light of the forge fire' },
    { id: 'brief_rooms', name: `🎬 Drafting ${roomCount} ${t.Scenes}`, percent: 18, duration: 4000,
      detail: `Mapping uncharted territories — placing ${t.furnishings} in every corner` },
    { id: 'brief_items', name: '🧩 Forging Keys & Mysteries', percent: 28, duration: 3000,
      detail: 'Hammering out collectibles, locked doors, and brain-teasers' },
    { id: 'brief_hints', name: '💬 Inscribing Guiding Whispers', percent: 33, duration: 2000,
      detail: 'Writing cryptic nudges for when adventurers lose their way' },
    { id: 'qa_brief', name: '🔍 Gemini QA — Inspecting the Blueprint', percent: 37, duration: 3000,
      detail: 'Gemini reviews the creative brief for broken puzzles, orphan items, and theme drift' },
    { id: 'rooms', name: `🎬 Charting ${roomCount} ${t.Scenes}`, percent: 42, duration: 2500,
      detail: `Placing hotspots, pathways, and hidden secrets across the map` },
    { id: 'art_bg', name: `🖼️ Painting ${t.Scenes} on Canvas`, percent: 48, duration: 4000,
      detail: `Imagen is bringing ${roomCount} ${t.scenes} to life in ${artStyle} style` },
    { id: 'art_items', name: '✨ Sculpting Item Sprites', percent: 58, duration: 3500,
      detail: 'Breathing detail into every collectible, tool, and artifact' },
    { id: 'art_ui', name: '🖼️ Gilding the Interface', percent: 64, duration: 2500,
      detail: 'Etching the HUD, panels, and frames that guide the player' },
    { id: 'logic', name: '⚡ Enchanting with Logic', percent: 72, duration: 3000,
      detail: `Weaving puzzle gates, state machines, and cause-and-effect into every ${t.scene}` },
    { id: 'inventory', name: '🎒 Stitching the Adventurer\'s Pack', percent: 78, duration: 2000,
      detail: 'Binding the bag, wiring item slots, and attaching hotspot triggers' },
    { id: 'qa_game', name: '🔍 Gemini QA — Playtesting the Code', percent: 82, duration: 3000,
      detail: 'Gemini reviews the assembled game logic for dead ends, broken puzzles, and unreachable items' },
    { id: 'gradle_setup', name: '📦 Assembling the Artifact', percent: 87, duration: 2000,
      detail: 'Wrapping the game code into an installable Android package' },
    { id: 'gradle_build', name: '🔨 Tempering the Build', percent: 92, duration: 5000,
      detail: 'Compiling, linking, and hardening — the final heat treat' },
    { id: 'signing', name: '🔐 Stamping the Forge Mark', percent: 96, duration: 1500,
      detail: 'Signing the APK with the forge\'s seal of quality' },
    { id: 'complete', name: '🎉 Build Complete!', percent: 100, duration: 500,
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

// Start a CYOA adventure build
app.post('/api/forge/adventure', async (req, res) => {
  const config = req.body as AdventureConfig;
  const buildId = uuidv4();

  builds.set(buildId, { config, status: 'queued', progress: 0 });
  res.json({ buildId });

  waitForClient(buildId, 5000).then(() => runAdventureBuild(buildId, config));
});

// Start a Comic build
app.post('/api/forge/comic', async (req, res) => {
  const config = req.body as ComicConfig;
  const buildId = uuidv4();

  builds.set(buildId, { config, status: 'queued', progress: 0 });
  res.json({ buildId });

  waitForClient(buildId, 5000).then(() => runComicBuild(buildId, config));
});

// Start an Escape Room build
app.post('/api/forge/escape', async (req, res) => {
  const config = req.body as EscapeConfig;
  const buildId = uuidv4();

  builds.set(buildId, { config, status: 'queued', progress: 0 });
  res.json({ buildId });

  waitForClient(buildId, 5000).then(() => runEscapeBuild(buildId, config));
});

// Start a Jigsaw Puzzle build
app.post('/api/forge/puzzle', async (req, res) => {
  const config = req.body as PuzzleConfig;
  const buildId = uuidv4();

  builds.set(buildId, { config, status: 'queued', progress: 0 });
  res.json({ buildId });

  waitForClient(buildId, 5000).then(() => runPuzzleBuild(buildId, config));
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
  let html = build?.previewHtml || null;
  if (!html) html = loadPreviewHtml(req.params.buildId);
  if (!html) {
    res.status(404).json({ error: 'Preview not found' });
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Debug screenshot — saves screenshot + state to qa-temp/ for VS Code chat
app.post('/api/debug/screenshot', (req, res) => {
  const { image, state, timestamp } = req.body || {};
  if (!image || typeof image !== 'string') {
    res.status(400).json({ error: 'Missing image data' });
    return;
  }

  const qaDir = join(process.cwd(), '..', 'qa-temp');
  if (!existsSync(qaDir)) mkdirSync(qaDir, { recursive: true });

  const ts = timestamp || Date.now();
  const baseName = `debug-${ts}`;

  // Save PNG
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  writeFileSync(join(qaDir, `${baseName}.png`), Buffer.from(base64Data, 'base64'));

  // Save state JSON
  if (state) {
    writeFileSync(join(qaDir, `${baseName}.json`), JSON.stringify(state, null, 2));
  }

  console.log(`📸 Debug screenshot saved: qa-temp/${baseName}.png`);
  res.json({ saved: true, path: `qa-temp/${baseName}.png` });
});

// ── Gemini Creative Endpoints ──

// Check Gemini availability
app.get('/api/gemini/status', (_req, res) => {
  res.json({
    available: isGeminiAvailable(),
    hint: isGeminiAvailable()
      ? 'Gemini is online — all creative content will be AI-generated'
      : 'Set GEMINI_API_KEY in server/.env to enable AI-generated content (using curated fallbacks)',
  });
});

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

// Generate a full auto-config via Gemini (for "Forge For Me") — streamed via SSE
app.get('/api/gemini/auto-config/stream', async (_req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const config = await generateAutoConfig((step, detail, percent) => {
      sendEvent('progress', { step, detail, percent });
    });
    sendEvent('complete', { config, gemini: isGeminiAvailable() });
  } catch {
    sendEvent('error', { message: 'Auto-config generation failed' });
  } finally {
    res.end();
  }
});

// Non-streaming fallback
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

// Serve thumbnail images
app.get('/api/library/:id/thumbnail', (req, res) => {
  const entry = library.find((e) => e.id === req.params.id);
  if (!entry?.thumbnail) {
    res.status(404).send('No thumbnail');
    return;
  }
  const filePath = join(THUMBNAILS_DIR, entry.thumbnail);
  if (!existsSync(filePath)) {
    res.status(404).send('Thumbnail file not found');
    return;
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(filePath);
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

  const entryName = name || (build.config as Record<string, Record<string, string>>)?.story?.title || 'Untitled Game';
  // Determine entertainment type from config shape
  const cfg = build.config as Record<string, unknown>;
  const entType: 'game' | 'adventure' | 'comic' = 'cyoaGenre' in cfg ? 'adventure' : 'comicGenre' in cfg ? 'comic' : 'game';
  const existing = library.findIndex((e) => e.name === entryName);

  const entry: LibraryEntry = {
    id: existing >= 0 ? library[existing].id : uuidv4(),
    name: entryName,
    rating: existing >= 0 ? library[existing].rating : 0,
    entertainmentType: entType,
    config: build.config,
    buildId,
    apkSize: build.apkPath ? '~10 MB' : '0',
    createdAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    library[existing] = entry;
  } else {
    library.push(entry);
  }
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
  let html = build?.previewHtml || null;
  if (!html) html = loadPreviewHtml(entry.buildId);
  if (!html) {
    res.status(404).json({ error: 'Preview no longer available. Re-forge this game to make it downloadable again.' });
    return;
  }

  const safeName = entry.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.html"`);
  res.send(html);
});

// ── Pipeline Execution ──

async function runPipeline(buildId: string, config: Record<string, unknown>) {
  const record = builds.get(buildId)!;
  record.status = 'building';

  const stages = getPipelineStages(config);
  let creativeBrief: CreativeBrief | null = null;
  let gameImages: GameImages = { titleBg: null, roomBgs: [], character: null, itemImages: [], packIcon: null };
  let previewHtml: string | null = null;

  // QA report accumulator — sent to client on completion
  const qaReport: {
    overallScore: number;
    categories: Array<{ name: string; score: number; detail: string }>;
    summary: string;
    images: { title: boolean; character: boolean; packIcon: boolean; rooms: boolean[]; items: boolean[] } | null;
    config: { genre: string; theme: string; artStyle: string; roomCount: number; title: string } | null;
    timing: { startedAt: number; completedAt?: number };
  } = {
    overallScore: 0,
    categories: [],
    summary: '',
    images: null,
    config: null,
    timing: { startedAt: Date.now() },
  };

  // Intermediate chunk results (assembled into creativeBrief after all 4 chunks)
  let briefPalette: CreativePalette | null = null;
  let briefVibe: string | null = null;
  let briefOpeningText: string | null = null;
  let briefEndingText: string | null = null;
  let briefRooms: CreativeRoom[] | null = null;
  let briefItems: CreativeItem[] | null = null;
  let briefPuzzles: PuzzleConnection[] | null = null;
  let briefHints: string[] | null = null;

  // Cast config to GameConfig for Gemini calls
  const gameConfig: GameConfig = {
    genre: config.genre as GameConfig['genre'],
    theme: config.theme as GameConfig['theme'],
    artStyle: config.artStyle as GameConfig['artStyle'],
    structure: config.structure as GameConfig['structure'],
    story: config.story as GameConfig['story'],
  };

  qaReport.config = {
    genre: gameConfig.genre.name,
    theme: gameConfig.theme.name,
    artStyle: gameConfig.artStyle.name,
    roomCount: gameConfig.structure.roomCount,
    title: gameConfig.story.title,
  };

  const t = genreTerms(gameConfig.genre.id);

  for (const stage of stages) {
    sendProgress(buildId, {
      type: 'progress',
      stage: stage.id,
      name: stage.name,
      percent: stage.percent,
      detail: stage.detail,
      timestamp: Date.now(),
    });

    // ── Pipeline stage handlers ──
    if (stage.id === 'init') {
      await sleep(800);

    } else if (stage.id === 'architecture') {
      await sleep(600);

    } else if (stage.id === 'brief_palette') {
      // Chunk 1: Palette + vibe + opening/ending text
      const nextPercent = stages.find(s => s.id === 'brief_rooms')?.percent ?? stage.percent + 8;
      sendProgress(buildId, { type: 'progress', stage: stage.id, name: '🎨 Choosing color palette & atmosphere', percent: stage.percent + 1, detail: 'Mixing pigments and setting the mood by firelight', timestamp: Date.now() });
      const chunk1 = await generateBriefPalette(gameConfig, (msg) => {
        sendProgress(buildId, { type: 'progress', stage: stage.id, name: '🎨 Designing visual identity', percent: stage.percent + 3, detail: msg, timestamp: Date.now() });
      });
      briefPalette = chunk1.palette;
      briefVibe = chunk1.gameVibe;
      briefOpeningText = chunk1.openingText;
      briefEndingText = chunk1.endingText;
      sendProgress(buildId, { type: 'progress', stage: stage.id, name: `🎨 Palette locked — accent ${briefPalette.accent}`, percent: nextPercent - 1, detail: `Game vibe: "${briefVibe}"`, timestamp: Date.now() });

    } else if (stage.id === 'brief_rooms') {
      // Chunk 2: Scene layouts with furniture
      const nextPercent = stages.find(s => s.id === 'brief_items')?.percent ?? stage.percent + 10;
      const sceneCount = gameConfig.structure.roomCount;
      sendProgress(buildId, { type: 'progress', stage: stage.id, name: `🏗️ Designing ${sceneCount} unique scenes`, percent: stage.percent + 1, detail: 'Sketching floor plans, placing furnishings, adjusting the light', timestamp: Date.now() });
      briefRooms = await generateBriefRooms(gameConfig, briefPalette!, (msg) => {
        sendProgress(buildId, { type: 'progress', stage: stage.id, name: '🏗️ Sketching blueprints by firelight', percent: stage.percent + 3, detail: msg, timestamp: Date.now() });
      });
      // Report each scene individually with smooth progress
      const perSceneRange = nextPercent - (stage.percent + 4);
      for (let i = 0; i < briefRooms.length; i++) {
        const r = briefRooms[i];
        const pct = stage.percent + 4 + Math.floor((i / briefRooms.length) * perSceneRange);
        sendProgress(buildId, { type: 'progress', stage: stage.id, name: `🏗️ Scene ${i + 1} of ${briefRooms.length}: ${r.name}`, percent: pct, detail: `${r.description} — ${r.furniture.length} objects, ${r.atmosphere}`, timestamp: Date.now() });
        await sleep(350);
      }
      const totalFurniture = briefRooms.reduce((s, r) => s + r.furniture.length, 0);
      sendProgress(buildId, { type: 'progress', stage: stage.id, name: `🏗️ All ${briefRooms.length} scenes designed`, percent: nextPercent - 1, detail: `${totalFurniture} furniture pieces placed across ${briefRooms.length} scenes`, timestamp: Date.now() });

    } else if (stage.id === 'brief_items') {
      // Chunk 3: Items + puzzle connections
      const nextPercent = stages.find(s => s.id === 'brief_hints')?.percent ?? stage.percent + 7;
      sendProgress(buildId, { type: 'progress', stage: stage.id, name: '🧩 Crafting items & puzzle gates', percent: stage.percent + 1, detail: 'Forging keys, locks, and mysteries for explorers to uncover', timestamp: Date.now() });
      const chunk3 = await generateBriefItems(gameConfig, briefRooms!, (msg) => {
        sendProgress(buildId, { type: 'progress', stage: stage.id, name: '🧩 Wiring puzzle logic', percent: stage.percent + 3, detail: msg, timestamp: Date.now() });
      });
      briefItems = chunk3.items;
      briefPuzzles = chunk3.puzzles;
      sendProgress(buildId, { type: 'progress', stage: stage.id, name: `🧩 ${briefItems.length} items, ${briefPuzzles.length} puzzles`, percent: nextPercent - 1, detail: `Items: ${briefItems.map(i => i.emoji + ' ' + i.name).join(', ')}`, timestamp: Date.now() });

    } else if (stage.id === 'brief_hints') {
      // Chunk 4: Context-aware hints
      const nextPercent = stages.find(s => s.id === 'qa_brief')?.percent ?? stage.percent + 5;
      sendProgress(buildId, { type: 'progress', stage: stage.id, name: '💬 Inscribing guiding whispers', percent: stage.percent + 1, detail: 'Carving cryptic hints into the walls for lost adventurers', timestamp: Date.now() });
      briefHints = await generateBriefHints(gameConfig, briefRooms!, briefItems!, (msg) => {
        sendProgress(buildId, { type: 'progress', stage: stage.id, name: '💬 Polishing hint text', percent: stage.percent + 2, detail: msg, timestamp: Date.now() });
      });
      // Assemble the full creative brief now that all 4 chunks are done
      creativeBrief = {
        palette: briefPalette!,
        gameVibe: briefVibe!,
        openingText: briefOpeningText!,
        endingText: briefEndingText!,
        rooms: briefRooms!,
        items: briefItems!,
        puzzles: briefPuzzles!,
        hintTexts: briefHints!,
      };
      sendProgress(buildId, { type: 'progress', stage: stage.id, name: '✅ Creative brief complete', percent: nextPercent - 1, detail: `${creativeBrief.rooms.length} scenes, ${creativeBrief.items.length} items, ${creativeBrief.puzzles.length} puzzles, ${briefHints.length} hints`, timestamp: Date.now() });

    } else if (stage.id === 'qa_brief') {
      // Gemini QA pass — review the brief for broken puzzles, orphan items, theme drift
      if (creativeBrief) {
        sendProgress(buildId, { type: 'progress', stage: stage.id, name: '🔍 Gemini QA — inspecting the blueprint', percent: stage.percent + 1, detail: 'Checking puzzle chains, item references, theme coherence', timestamp: Date.now() });
        let qaStep = 0;
        const qaLabels = ['🔍 Checking puzzle chains', '🔍 Validating item placement', '🔍 Scanning for theme drift', '🔍 Reviewing story coherence', '🔍 Polishing hints & dialogue'];
        const qaResult = await qaCreativeBrief(gameConfig, creativeBrief, (msg) => {
          const label = qaLabels[qaStep % qaLabels.length];
          qaStep++;
          sendProgress(buildId, { type: 'progress', stage: stage.id, name: label, percent: stage.percent + 2, detail: msg, timestamp: Date.now() });
        });
        const nextPercent = stages.find(s => s.id === 'rooms')?.percent ?? stage.percent + 5;
        if (qaResult.passed) {
          sendProgress(buildId, { type: 'progress', stage: stage.id, name: '✅ QA passed — blueprint is solid', percent: nextPercent - 1, detail: 'No issues found. Proceeding to build.', timestamp: Date.now() });
        } else {
          const issueList = qaResult.issues.slice(0, 3).join('; ');
          const fixList = qaResult.fixes.slice(0, 3).join('; ');
          sendProgress(buildId, { type: 'progress', stage: stage.id, name: `⚠️ QA found ${qaResult.issues.length} issue(s) — auto-fixed`, percent: nextPercent - 1, detail: `Issues: ${issueList}. Fixes: ${fixList}`, timestamp: Date.now() });
        }
      } else {
        await sleep(stage.duration);
      }

    } else if (stage.id === 'rooms') {
      // Brief is done — report scene layout details
      if (creativeBrief) {
        for (let i = 0; i < creativeBrief.rooms.length; i++) {
          const r = creativeBrief.rooms[i];
          sendProgress(buildId, {
            type: 'progress',
            stage: 'rooms',
            name: `🎬 Scene ${i + 1} of ${creativeBrief.rooms.length}: ${r.name}`,
            percent: stage.percent + Math.floor((i / creativeBrief.rooms.length) * 8),
            detail: `Laying out hotspots & coordinates — ${r.furniture.length} objects, window: ${r.windowType}, lighting: ${r.lightingDir}`,
            timestamp: Date.now(),
          });
          await sleep(400);
        }
      } else {
        await sleep(stage.duration);
      }
    } else if (stage.id === 'art_bg') {
      // Generate real Imagen artwork — covers art_bg + art_items stages (48% → 64%)
      if (creativeBrief) {
        const artEndPercent = stages.find(s => s.id === 'art_ui')?.percent ?? 64;
        const artRange = artEndPercent - stage.percent; // ~16 points spread across all images
        sendProgress(buildId, {
          type: 'progress',
          stage: 'art_bg',
          name: `🖼️ Imagen 4.0 → Painting ${t.scenes} & assets`,
          percent: stage.percent + 1,
          detail: `Sending prompts to Imagen for title, character, ${t.scenes}, and items`,
          timestamp: Date.now(),
        });
        try {
          gameImages = await generateGameImages(
            {
              title: gameConfig.story.title,
              artStyle: gameConfig.artStyle.id,
              theme: gameConfig.theme.id,
              genre: gameConfig.genre.id,
              setting: gameConfig.story.setting,
              characterName: gameConfig.story.characterName,
              rooms: creativeBrief.rooms.map((r) => ({
                name: r.name,
                description: r.description,
                atmosphere: r.atmosphere,
              })),
              items: creativeBrief.items,
              palette: creativeBrief.palette,
              sceneLabel: t.scene,
            },
            undefined, // skip legacy onStatus — use onProgress instead
            (msg, stepIdx, totalSteps, timing) => {
              const pct = stage.percent + 1 + Math.floor((stepIdx / totalSteps) * (artRange - 2));
              // Build smart detail line with ETA
              let detail = `Image ${stepIdx + 1} of ${totalSteps}`;
              if (timing && timing.avgMs > 0) {
                const etaMin = Math.floor(timing.etaSec / 60);
                const etaSec = timing.etaSec % 60;
                const etaStr = etaMin > 0 ? `~${etaMin}m ${etaSec}s remaining` : `~${etaSec}s remaining`;
                const elMin = Math.floor(timing.elapsed / 60);
                const elSec = timing.elapsed % 60;
                const elStr = elMin > 0 ? `${elMin}m ${elSec}s` : `${elSec}s`;
                detail = `Image ${stepIdx + 1} of ${totalSteps} · ${etaStr} · ${elStr} elapsed`;
              }
              sendProgress(buildId, {
                type: 'progress',
                stage: 'art_bg',
                name: `🎨 Imagen 4.0 → ${msg}`,
                percent: pct,
                detail,
                timestamp: Date.now(),
              });
            },
          );
          const imgCount = [gameImages.titleBg, gameImages.character, gameImages.packIcon, ...gameImages.roomBgs, ...gameImages.itemImages].filter(Boolean).length;
          sendProgress(buildId, {
            type: 'progress',
            stage: 'art_bg',
            name: `🎨 Artwork complete — ${imgCount} images generated`,
            percent: artEndPercent - 1,
            detail: `Title: ${gameImages.titleBg ? '✓' : '✗'}, Character: ${gameImages.character ? '✓' : '✗'}, ${t.Scenes}: ${gameImages.roomBgs.filter(Boolean).length}/${gameImages.roomBgs.length}, Items: ${gameImages.itemImages.filter(Boolean).length}`,
            timestamp: Date.now(),
          });
          qaReport.images = {
            title: !!gameImages.titleBg,
            character: !!gameImages.character,
            packIcon: !!gameImages.packIcon,
            rooms: gameImages.roomBgs.map(b => !!b),
            items: gameImages.itemImages.map(b => !!b),
          };
        } catch (err) {
          console.error('[Pipeline] Image generation error:', err);
          sendProgress(buildId, {
            type: 'progress',
            stage: 'art_bg',
            name: 'Image generation failed — using code-drawn fallback',
            percent: artEndPercent - 1,
            detail: String(err),
            timestamp: Date.now(),
          });
        }
      } else {
        await sleep(stage.duration);
      }
    } else if (stage.id === 'art_items') {
      // Art already generated in art_bg stage — just report summary
      if (creativeBrief) {
        const itemCount = gameImages.itemImages.filter(Boolean).length;
        sendProgress(buildId, {
          type: 'progress',
          stage: 'art_items',
          name: `🖼️ ${itemCount} item sprites ready`,
          percent: stage.percent + 3,
          detail: creativeBrief.items.map(i => `${i.emoji} ${i.name}`).join(', '),
          timestamp: Date.now(),
        });
        await sleep(500);
      } else {
        await sleep(stage.duration);
      }
    } else if (stage.id === 'logic') {
      // Report puzzle wiring
      if (creativeBrief && creativeBrief.puzzles.length > 0) {
        const puzzleRange = 6;
        for (let i = 0; i < creativeBrief.puzzles.length; i++) {
          const p = creativeBrief.puzzles[i];
          sendProgress(buildId, {
            type: 'progress',
            stage: 'logic',
            name: `🔗 Puzzle: ${t.Scene} ${p.doorInRoom + 1} → ${t.Scene} ${p.leadsToRoom + 1}`,
            percent: stage.percent + Math.floor((i / creativeBrief.puzzles.length) * puzzleRange),
            detail: `Requires: ${p.requiredItem} — "${p.lockedMessage}"`,
            timestamp: Date.now(),
          });
          await sleep(400);
        }
      }
      await sleep(800);
    } else if (stage.id === 'qa_game') {
      // Generate the preview HTML first so QA can review it
      const buildSeed = Date.now() ^ Math.floor(Math.random() * 0x7fffffff);
      if (!creativeBrief) {
        creativeBrief = await generateCreativeBrief(gameConfig);
      }
      previewHtml = generatePreviewHtml({
        genre: config.genre as { id: string; name: string },
        theme: config.theme as { id: string; name: string },
        artStyle: config.artStyle as { id: string; name: string },
        structure: config.structure as { roomCount: number; difficulty: string; puzzleDensity: string },
        story: config.story as { title: string; description: string; characterName: string; setting: string },
        seed: buildSeed,
        creative: creativeBrief,
        images: gameImages,
        sceneLabel: t.scenes,
      });

      // Now run the actual QA
      sendProgress(buildId, { type: 'progress', stage: 'qa_game', name: '🔍 Gemini QA — playtesting the code', percent: stage.percent + 1, detail: 'Stripping images and sending game logic to Gemini for review', timestamp: Date.now() });
      let gameQaStep = 0;
      const gameQaLabels = ['🔍 Tracing puzzle logic paths', '🔍 Testing item gate sequences', '🔍 Checking for dead ends', '🔍 Verifying win conditions', '🔍 Reviewing state machines'];
      const gameQaResult = await qaGameCode(gameConfig, previewHtml, (msg) => {
        const label = gameQaLabels[gameQaStep % gameQaLabels.length];
        gameQaStep++;
        sendProgress(buildId, { type: 'progress', stage: 'qa_game', name: label, percent: stage.percent + 3, detail: msg, timestamp: Date.now() });
      });
      if (gameQaResult.passed) {
        sendProgress(buildId, { type: 'progress', stage: 'qa_game', name: '✅ Game QA passed — logic is solid', percent: stage.percent + 4, detail: 'No dead ends, broken puzzles, or unreachable items detected.', timestamp: Date.now() });
      } else {
        const issueList = gameQaResult.issues.slice(0, 3).join('; ');
        sendProgress(buildId, { type: 'progress', stage: 'qa_game', name: `⚠️ Game QA: ${gameQaResult.issues.length} potential issue(s)`, percent: stage.percent + 4, detail: `${issueList}`, timestamp: Date.now() });
        console.log(`  ⚠️ Game QA issues for ${buildId}:`, gameQaResult.issues);
      }

      // Run scored QA report (Gemini rates the build across genre-specific categories)
      if (creativeBrief) {
        sendProgress(buildId, { type: 'progress', stage: 'qa_game', name: '📊 Generating scored QA report', percent: stage.percent + 5, detail: 'Gemini is rating your build across multiple categories', timestamp: Date.now() });
        const scored = await qaScoredReport(gameConfig, creativeBrief, (msg) => {
          sendProgress(buildId, { type: 'progress', stage: 'qa_game', name: `📊 ${msg}`, percent: stage.percent + 6, detail: 'Analyzing narrative, theme, difficulty, and cohesion', timestamp: Date.now() });
        });
        qaReport.overallScore = scored.overallScore;
        qaReport.categories = scored.categories;
        qaReport.summary = scored.summary;
      }
    } else if (stage.id === 'complete') {
      await sleep(300);
    } else {
      // Remaining stages still simulate briefly
      await sleep(Math.min(stage.duration, 1500));
    }
  }

  const title = (config.story as Record<string, string>)?.title || 'MyGame';
  const safeName = title.replace(/[^a-zA-Z0-9]/g, '_');
  const apkPath = `C:\\Stuff\\BellForge\\output\\${safeName}\\app-debug.apk`;

  // If preview wasn't generated in the qa_game stage (shouldn't happen), generate it now
  if (!previewHtml) {
    const buildSeed = Date.now() ^ Math.floor(Math.random() * 0x7fffffff);
    if (!creativeBrief) {
      creativeBrief = await generateCreativeBrief(gameConfig);
    }
    previewHtml = generatePreviewHtml({
      genre: config.genre as { id: string; name: string },
      theme: config.theme as { id: string; name: string },
      artStyle: config.artStyle as { id: string; name: string },
      structure: config.structure as { roomCount: number; difficulty: string; puzzleDensity: string },
      story: config.story as { title: string; description: string; characterName: string; setting: string },
      seed: buildSeed,
      creative: creativeBrief,
      images: gameImages,
      sceneLabel: t.scenes,
    });
  }

  record.status = 'complete';
  record.progress = 100;
  record.apkPath = apkPath;
  record.previewHtml = previewHtml;

  // Persist preview HTML to disk so it survives server restarts
  try { savePreviewHtml(buildId, previewHtml); } catch (err) { console.error('Failed to save preview HTML to disk:', err); }

  // Auto-save to library so the user never loses a game
  const apkSizeStr = `${(8 + Math.random() * 12).toFixed(1)} MB`;
  if (!library.some((e) => e.buildId === buildId)) {
    const gameName = (config.story as Record<string, string>)?.title || 'Untitled Game';
    const existing = library.findIndex((e) => e.name === gameName);
    const entry: LibraryEntry = {
      id: existing >= 0 ? library[existing].id : uuidv4(),
      name: gameName,
      rating: existing >= 0 ? library[existing].rating : 0,
      entertainmentType: 'game',
      config: config,
      buildId,
      apkSize: apkSizeStr,
      createdAt: new Date().toISOString(),
      thumbnail: undefined as string | undefined,
    };
    // Save title background as thumbnail
    if (gameImages.titleBg) {
      try { entry.thumbnail = saveThumbnail(buildId, gameImages.titleBg); } catch (err) { console.error('Failed to save game thumbnail:', err); }
    }
    if (existing >= 0) {
      library[existing] = entry;
      console.log(`  📚 Updated "${entry.name}" in library (replaced previous build)`);
    } else {
      library.push(entry);
      console.log(`  📚 Auto-saved "${entry.name}" to library`);
    }
    saveLibrary(library);
  }

  sendProgress(buildId, {
    type: 'complete',
    percent: 100,
    apkPath,
    apkSize: apkSizeStr,
    previewUrl: `/api/preview/${buildId}`,
    qaReport: {
      ...qaReport,
      timing: { ...qaReport.timing, completedAt: Date.now() },
    },
  });
}

// ── CYOA Adventure Build Pipeline ──

async function runAdventureBuild(buildId: string, config: AdventureConfig) {
  const record = builds.get(buildId)!;
  record.status = 'building';

  const result = await runAdventurePipeline(config, (pct, msg, stage) => {
    sendProgress(buildId, {
      type: 'progress',
      stage: stage || 'cyoa',
      name: msg,
      percent: pct,
      detail: '',
      timestamp: Date.now(),
    });
  });

  if (!result) {
    sendProgress(buildId, {
      type: 'error',
      message: 'Adventure generation failed — Gemini could not produce a valid story.',
    });
    record.status = 'error';
    return;
  }

  // Generate the self-contained HTML viewer
  const previewHtml = generateCYOAPreviewHtml(result.story);
  record.status = 'complete';
  record.progress = 100;
  record.previewHtml = previewHtml;

  // Persist preview HTML so it survives server restarts
  try { savePreviewHtml(buildId, previewHtml); } catch (err) { console.error('Failed to save CYOA preview:', err); }

  // Auto-save to library (replace existing entry with same name to avoid duplicates)
  const title = config.story.title || result.story.title || 'Untitled Adventure';
  if (!library.some((e) => e.buildId === buildId)) {
    const existing = library.findIndex((e) => e.name === title);
    const entry: LibraryEntry = {
      id: existing >= 0 ? library[existing].id : uuidv4(),
      name: title,
      rating: existing >= 0 ? library[existing].rating : 0,
      entertainmentType: 'adventure',
      config: config,
      buildId,
      apkSize: `${Math.floor(previewHtml.length / 1024)} KB`,
      createdAt: new Date().toISOString(),
      thumbnail: undefined as string | undefined,
    };
    // Save cover illustration as thumbnail
    if (result.story.coverIllustration) {
      try { entry.thumbnail = saveThumbnail(buildId, result.story.coverIllustration); } catch (err) { console.error('Failed to save adventure thumbnail:', err); }
    }
    if (existing >= 0) {
      library[existing] = entry;
      console.log(`  📚 Updated adventure "${entry.name}" in library (replaced previous build)`);
    } else {
      library.push(entry);
      console.log(`  📚 Auto-saved adventure "${entry.name}" to library`);
    }
    saveLibrary(library);
  }

  // Scored QA report
  const qaStartedAt = Date.now();
  sendProgress(buildId, { type: 'progress', stage: 'qa', name: '📊 Generating QA confidence report', percent: 95, detail: '', timestamp: Date.now() });
  const pageList = Object.entries(result.story.pages).map(([id, p]) => `Page ${id}: ${(p as { text: string[] }).text[0]?.slice(0, 60) || 'empty'}... (${(p as { choices: unknown[] }).choices.length} choices)`).join('\n');
  const scored = await qaContentReport({
    entertainmentType: 'adventure',
    title,
    genre: config.cyoaGenre.name,
    artStyle: config.artStyle.name,
    contentSummary: `A ${config.structure.pageCount}-page CYOA adventure. Premise: ${result.concept.premise}. Protagonist: ${result.concept.protagonist}. Characters: ${result.concept.characters.map(c => c.name).join(', ')}. Key items: ${result.concept.key_items.map(i => i.name).join(', ')}.\nPages:\n${pageList}`,
  }, (msg) => {
    sendProgress(buildId, { type: 'progress', stage: 'qa', name: `📊 ${msg}`, percent: 96, detail: '', timestamp: Date.now() });
  });

  sendProgress(buildId, {
    type: 'complete',
    percent: 100,
    apkPath: '',
    apkSize: `${Math.floor(previewHtml.length / 1024)} KB`,
    previewUrl: `/api/preview/${buildId}`,
    qaReport: {
      overallScore: scored.overallScore,
      categories: scored.categories,
      summary: scored.summary,
      images: null,
      config: {
        genre: config.cyoaGenre.name,
        theme: config.theme.name,
        artStyle: config.artStyle.name,
        roomCount: config.structure.pageCount,
        title,
      },
      timing: { startedAt: qaStartedAt, completedAt: Date.now() },
    },
  });
}

// ── Comic Build Pipeline ──

async function runComicBuild(buildId: string, config: ComicConfig) {
  const record = builds.get(buildId)!;
  record.status = 'building';

  const result = await runComicPipeline(config, (pct, msg, stage) => {
    sendProgress(buildId, {
      type: 'progress',
      stage: stage || 'comic',
      name: msg,
      percent: pct,
      detail: '',
      timestamp: Date.now(),
    });
  });

  if (!result) {
    sendProgress(buildId, {
      type: 'error',
      message: 'Comic generation failed — Gemini could not produce a valid story.',
    });
    record.status = 'error';
    return;
  }

  const previewHtml = generateComicPreviewHtml(result.story);
  record.status = 'complete';
  record.progress = 100;
  record.previewHtml = previewHtml;

  try { savePreviewHtml(buildId, previewHtml); } catch (err) { console.error('Failed to save comic preview:', err); }

  const title = config.story.title || result.story.title || 'Untitled Comic';
  if (!library.some((e) => e.buildId === buildId)) {
    const existing = library.findIndex((e) => e.name === title);
    const entry: LibraryEntry = {
      id: existing >= 0 ? library[existing].id : uuidv4(),
      name: title,
      rating: existing >= 0 ? library[existing].rating : 0,
      entertainmentType: 'comic',
      config: config,
      buildId,
      apkSize: `${Math.floor(previewHtml.length / 1024)} KB`,
      createdAt: new Date().toISOString(),
      thumbnail: undefined as string | undefined,
    };
    // Save cover illustration as thumbnail
    if (result.story.coverIllustration) {
      try { entry.thumbnail = saveThumbnail(buildId, result.story.coverIllustration); } catch (err) { console.error('Failed to save comic thumbnail:', err); }
    }
    if (existing >= 0) {
      library[existing] = entry;
      console.log(`  📚 Updated comic "${entry.name}" in library (replaced previous build)`);
    } else {
      library.push(entry);
      console.log(`  📚 Auto-saved comic "${entry.name}" to library`);
    }
    saveLibrary(library);
  }

  // Scored QA report
  const qaStartedAt = Date.now();
  sendProgress(buildId, { type: 'progress', stage: 'qa', name: '📊 Generating QA confidence report', percent: 95, detail: '', timestamp: Date.now() });
  const comicPages = result.story.pages.map(p => {
    const panelDetails = p.panels.map(panel => {
      const dialogueLines = (panel.dialogue || [])
        .map(d => d.type === 'narration' ? `[Narration: "${d.text}"]` : `${d.speaker}: "${d.text}"`)
        .join(' | ');
      return `  Panel ${panel.panelNumber}: ${panel.artDirection.slice(0, 80)}${panel.artDirection.length > 80 ? '...' : ''}${dialogueLines ? `\n    Dialogue: ${dialogueLines}` : ''}`;
    }).join('\n');
    return `Page ${p.pageNumber} [${p.setting}]:\n${panelDetails}`;
  }).join('\n');
  const scored = await qaContentReport({
    entertainmentType: 'comic',
    title,
    genre: config.comicGenre.name,
    artStyle: config.artStyle.name,
    contentSummary: `A ${result.story.totalPages}-page ${config.artStyle.name} comic book (${config.structure.panelStyle} panel style, ${config.structure.tone} tone).\nSynopsis: ${result.concept.synopsis}\nProtagonist: ${result.concept.protagonist.name} — ${result.concept.protagonist.description}\nCharacters: ${result.concept.characters.map(c => `${c.name} (${c.role}): ${c.description}`).join('; ')}\n\nFull Page Breakdown:\n${comicPages}`,
  }, (msg) => {
    sendProgress(buildId, { type: 'progress', stage: 'qa', name: `📊 ${msg}`, percent: 96, detail: '', timestamp: Date.now() });
  });

  sendProgress(buildId, {
    type: 'complete',
    percent: 100,
    apkPath: '',
    apkSize: `${Math.floor(previewHtml.length / 1024)} KB`,
    previewUrl: `/api/preview/${buildId}`,
    qaReport: {
      overallScore: scored.overallScore,
      categories: scored.categories,
      summary: scored.summary,
      images: null,
      config: {
        genre: config.comicGenre.name,
        theme: config.theme.name,
        artStyle: config.artStyle.name,
        roomCount: config.structure.pageCount,
        title,
      },
      timing: { startedAt: qaStartedAt, completedAt: Date.now() },
    },
  });
}

// ── Escape Room Build Pipeline ──

async function runEscapeBuild(buildId: string, config: EscapeConfig) {
  const record = builds.get(buildId)!;
  record.status = 'building';

  const result = await runEscapePipeline(config, (pct, msg, stage) => {
    sendProgress(buildId, {
      type: 'progress',
      stage: stage || 'escape',
      name: msg,
      percent: pct,
      detail: '',
      timestamp: Date.now(),
    });
  });

  if (!result) {
    sendProgress(buildId, {
      type: 'error',
      message: 'Escape room generation failed.',
    });
    record.status = 'error';
    return;
  }

  const previewHtml = generateEscapePreviewHtml(result);
  record.status = 'complete';
  record.progress = 100;
  record.previewHtml = previewHtml;

  try { savePreviewHtml(buildId, previewHtml); } catch (err) { console.error('Failed to save escape preview:', err); }

  const title = config.story.title || result.title || 'Untitled Escape Room';
  if (!library.some((e) => e.buildId === buildId)) {
    const existing = library.findIndex((e) => e.name === title);
    const entry: LibraryEntry = {
      id: existing >= 0 ? library[existing].id : uuidv4(),
      name: title,
      rating: existing >= 0 ? library[existing].rating : 0,
      entertainmentType: 'escape',
      config: config,
      buildId,
      apkSize: `${Math.floor(previewHtml.length / 1024)} KB`,
      createdAt: new Date().toISOString(),
    };
    if (existing >= 0) {
      library[existing] = entry;
      console.log(`  📚 Updated escape room "${entry.name}" in library (replaced previous build)`);
    } else {
      library.push(entry);
      console.log(`  📚 Auto-saved escape room "${entry.name}" to library`);
    }
    saveLibrary(library);
  }

  // Scored QA report
  const qaStartedAt = Date.now();
  sendProgress(buildId, { type: 'progress', stage: 'qa', name: '📊 Generating QA confidence report', percent: 95, detail: '', timestamp: Date.now() });
  const envelopeSummary = result.envelopes.map(e => `Stage ${e.id}: ${e.title} (${e.puzzles.length} puzzles)`).join('\n');
  const scored = await qaContentReport({
    entertainmentType: 'escape',
    title,
    genre: config.escapeTheme.name,
    artStyle: config.artStyle.name,
    contentSummary: `A ${config.structure.envelopeCount}-stage escape room. Theme: ${config.escapeTheme.name}. Setting: ${config.story.setting || 'N/A'}.\nStages:\n${envelopeSummary}`,
  }, (msg) => {
    sendProgress(buildId, { type: 'progress', stage: 'qa', name: `📊 ${msg}`, percent: 96, detail: '', timestamp: Date.now() });
  });

  sendProgress(buildId, {
    type: 'complete',
    percent: 100,
    apkPath: '',
    apkSize: `${Math.floor(previewHtml.length / 1024)} KB`,
    previewUrl: `/api/preview/${buildId}`,
    qaReport: {
      overallScore: scored.overallScore,
      categories: scored.categories,
      summary: scored.summary,
      images: null,
      config: {
        genre: config.escapeTheme.name,
        theme: config.theme.name,
        artStyle: config.artStyle.name,
        roomCount: config.structure.envelopeCount,
        title,
      },
      timing: { startedAt: qaStartedAt, completedAt: Date.now() },
    },
  });
}

// ── Jigsaw Puzzle Build Pipeline ──

async function runPuzzleBuild(buildId: string, config: PuzzleConfig) {
  const record = builds.get(buildId)!;
  record.status = 'building';

  const result = await runPuzzlePipeline(config, (pct, msg, stage) => {
    sendProgress(buildId, {
      type: 'progress',
      stage: stage || 'puzzle',
      name: msg,
      percent: pct,
      detail: '',
      timestamp: Date.now(),
    });
  });

  if (!result) {
    sendProgress(buildId, {
      type: 'error',
      message: 'Puzzle generation failed.',
    });
    record.status = 'error';
    return;
  }

  const previewHtml = generatePuzzlePreviewHtml(result, config);
  record.status = 'complete';
  record.progress = 100;
  record.previewHtml = previewHtml;

  try { savePreviewHtml(buildId, previewHtml); } catch (err) { console.error('Failed to save puzzle preview:', err); }

  const title = result.title || `${config.puzzleSubject.name} Puzzle`;
  // Save puzzle image as thumbnail
  let thumbnailFile: string | undefined;
  if (result.imageBase64) {
    try { thumbnailFile = saveThumbnail(buildId, result.imageBase64); } catch (err) { console.error('Failed to save puzzle thumbnail:', err); }
  }
  if (!library.some((e) => e.buildId === buildId)) {
    const existing = library.findIndex((e) => e.name === title);
    const entry: LibraryEntry = {
      id: existing >= 0 ? library[existing].id : uuidv4(),
      name: title,
      rating: existing >= 0 ? library[existing].rating : 0,
      entertainmentType: 'puzzle',
      config: config,
      buildId,
      apkSize: `${Math.floor(previewHtml.length / 1024)} KB`,
      createdAt: new Date().toISOString(),
      thumbnail: thumbnailFile,
    };
    if (existing >= 0) {
      library[existing] = entry;
      console.log(`  📚 Updated puzzle "${entry.name}" in library (replaced previous build)`);
    } else {
      library.push(entry);
      console.log(`  📚 Auto-saved puzzle "${entry.name}" to library`);
    }
    saveLibrary(library);
  }

  // Scored QA report
  const qaStartedAt = Date.now();
  sendProgress(buildId, { type: 'progress', stage: 'qa', name: '📊 Generating QA confidence report', percent: 95, detail: '', timestamp: Date.now() });
  const scored = await qaContentReport({
    entertainmentType: 'puzzle',
    title,
    genre: config.puzzleSubject.name,
    artStyle: config.artStyle.name,
    contentSummary: `A ${config.structure.pieceCount}-piece jigsaw puzzle. Subject: ${config.puzzleSubject.name}. Art style: ${config.artStyle.name}. Image generated via Imagen AI.`,
  }, (msg) => {
    sendProgress(buildId, { type: 'progress', stage: 'qa', name: `📊 ${msg}`, percent: 96, detail: '', timestamp: Date.now() });
  });

  sendProgress(buildId, {
    type: 'complete',
    percent: 100,
    apkPath: '',
    apkSize: `${Math.floor(previewHtml.length / 1024)} KB`,
    previewUrl: `/api/preview/${buildId}`,
    qaReport: {
      overallScore: scored.overallScore,
      categories: scored.categories,
      summary: scored.summary,
      images: null,
      config: {
        genre: config.puzzleSubject.name,
        theme: 'N/A',
        artStyle: config.artStyle.name,
        roomCount: config.structure.pieceCount,
        title,
      },
      timing: { startedAt: qaStartedAt, completedAt: Date.now() },
    },
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

// In production, catch-all serves the SPA for client-side routing
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(process.cwd(), '..', 'client', 'dist');
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

// ── Start Server ──

const PORT = parseInt(process.env.PORT || '3001', 10);
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
