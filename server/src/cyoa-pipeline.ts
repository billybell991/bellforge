// ── CYOA Adventure Pipeline ──
// Generates a complete Choose Your Own Adventure book via Gemini + Imagen

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AdventureConfig } from './pipeline/types.js';
import { generateImage } from './imagen.js';

const apiKey = process.env.GEMINI_API_KEY;
let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

const ANTI_TEXT = 'absolutely no text no words no letters no writing no logos no UI no signage no titles no speech bubbles no captions no narration boxes';

// ── Types ──

export interface CYOAConcept {
  title: string;
  subtitle: string;
  premise: string;
  protagonist: string;
  characters: { name: string; description: string; role: string }[];
  key_items: { name: string; display_name: string; description: string }[];
  page_map: CYOAPageEntry[];
}

export interface CYOAPageEntry {
  id: string;
  summary: string;
  setting: string;
  character_present?: string;
  is_ending: boolean;
  ending_type?: 'good' | 'bad' | 'neutral';
  items_found?: string[];
  choices: { text: string; target: string; item_required?: string }[];
}

export interface CYOAStory {
  title: string;
  subtitle: string;
  genre: string;
  bookNumber: number;
  totalPages: number;
  coverIllustration: string | null;
  pages: Record<string, CYOAPage>;
}

export interface CYOAPage {
  text: string[];
  illustration: string | null;
  illustrationCaption: string | null;
  choices: { text: string; page: string; itemRequired?: string }[];
  isEnding: boolean;
  endingType?: string | null;
  items: string[];
  flags: string[];
  conditionalText: { flag: string; text: string }[];
}

// ── Helpers ──

async function askGemini(prompt: string, temperature = 0.8, jsonMode = false): Promise<string | null> {
  if (!model) return null;

  const config: Record<string, unknown> = { temperature };
  if (jsonMode) {
    (config as Record<string, unknown>).responseMimeType = 'application/json';
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: config as Parameters<typeof model.generateContent>[0] extends { generationConfig?: infer G } ? G : never,
      });
      return result.response.text();
    } catch (e: unknown) {
      const errStr = String(e).toLowerCase();
      if (errStr.includes('resource_exhausted') || errStr.includes('quota')) {
        await sleep(30000);
      } else {
        await sleep((2 ** attempt) * 4000);
      }
    }
  }
  return null;
}

function parseJsonResponse(text: string | null): Record<string, unknown> | null {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* ignore */ }
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Phase 1: Concept Generation ──

export async function phaseConcept(
  config: AdventureConfig,
  onProgress?: (msg: string) => void,
): Promise<CYOAConcept | null> {
  const genre = config.cyoaGenre.id;
  const deadliness = config.structure?.deadliness || 'medium';
  const pageCount = config.structure?.pageCount || 20;
  const storySeed = config.story.description || '';
  const themeName = config.theme.name;

  const deadlinessDesc: Record<string, string> = {
    low: 'mostly divergent paths with few endings, forgiving and exploratory',
    medium: 'balanced danger with some dead ends and some divergent paths',
    high: 'many deadly endings, choices feel consequential and dangerous',
    brutal: 'death lurks behind nearly every wrong choice, only the cleverest survive',
  };

  const numEndings = Math.max(3, Math.floor(pageCount * 0.25));
  const seedLine = storySeed ? `\nStory seed/premise to incorporate: "${storySeed}"` : '';

  onProgress?.('Asking Gemini to design the story outline...');

  const prompt = `You are a master Choose Your Own Adventure book author.

Create a complete story OUTLINE for a CYOA book with exactly ${pageCount} pages.
Adventure type: ${config.cyoaGenre.name}
Theme/atmosphere: ${themeName}
Deadliness: ${deadliness} — ${deadlinessDesc[deadliness] || 'moderate'}
${seedLine}

Output valid JSON:
{
  "title": "Book Title",
  "subtitle": "A one-line hook",
  "premise": "2-3 sentence premise",
  "protagonist": "Who is the reader/protagonist",
  "characters": [
    {"name": "Name", "description": "Brief desc", "role": "ally/antagonist/neutral"}
  ],
  "key_items": [
    {"name": "item_name_underscored", "display_name": "Display Name", "description": "What it does"}
  ],
  "page_map": [
    {
      "id": "1",
      "summary": "One-line summary",
      "setting": "The location/setting",
      "character_present": "Name or null",
      "is_ending": false,
      "ending_type": null,
      "items_found": [],
      "choices": [
        {"text": "Choice text for reader", "target": "5"},
        {"text": "Alternative choice", "target": "12"}
      ]
    }
  ]
}

CRITICAL RULES:
- Page "1" is always the opening
- Every non-ending page must have 2-3 choices
- Ending pages have empty choices array and is_ending=true
- ending_type is "good", "bad", or "neutral"
- At least 2 good endings, at least 1 neutral
- ALL pages must be reachable from page 1 (no orphan pages)
- Create a branching tree, NOT a linear path
- Include 3-5 key items that gate certain paths (add "item_required": "item_name" to gated choices)
- Target ~${numEndings} ending pages
- Each choice's "text" must accurately describe transitioning to the target page's setting

Output ONLY the JSON.`;

  const result = await askGemini(prompt, 0.9, true);
  const parsed = parseJsonResponse(result);
  if (!parsed) return null;

  // Use title from config.story if provided
  if (config.story.title) {
    parsed.title = config.story.title;
  }

  return parsed as unknown as CYOAConcept;
}

// ── Phase 2: Prose Generation ──

export async function phaseProse(
  concept: CYOAConcept,
  config: AdventureConfig,
  onProgress?: (msg: string) => void,
): Promise<Record<string, string[]>> {
  const pages = concept.page_map;
  const chunkSize = 5;
  const allProse: Record<string, string[]> = {};

  const context = {
    title: concept.title,
    premise: concept.premise,
    protagonist: concept.protagonist,
    characters: concept.characters,
    genre: config.cyoaGenre.name,
    theme: config.theme.name,
  };

  for (let i = 0; i < pages.length; i += chunkSize) {
    const chunk = pages.slice(i, i + chunkSize);
    const chunkNum = Math.floor(i / chunkSize) + 1;
    const totalChunks = Math.ceil(pages.length / chunkSize);
    onProgress?.(`Writing prose chunk ${chunkNum}/${totalChunks} (${chunk.length} pages)...`);

    const prompt = `You are writing prose for a Choose Your Own Adventure book.

BOOK CONTEXT:
Title: ${context.title}
Genre: ${context.genre}
Theme: ${context.theme}
Premise: ${context.premise}
Protagonist: ${context.protagonist}
Characters: ${JSON.stringify(context.characters, null, 2)}

Write 2-4 paragraphs of vivid, atmospheric second-person prose for each page.

PAGES TO WRITE:
${JSON.stringify(chunk, null, 2)}

Output valid JSON mapping page ID to array of paragraph strings:
{
  "${chunk[0].id}": ["First paragraph...", "Second paragraph...", "Third paragraph..."]
}

STYLE:
- Second person ("You"), present tense
- Vivid sensory details
- Build tension and atmosphere
- For endings: good = triumphant, bad = ominous/horrifying, neutral = bittersweet
- 2-4 sentences per paragraph
- Don't mention page numbers in the prose
- NEVER refer to the protagonist in third person — the reader IS the protagonist

Output ONLY the JSON.`;

    const result = await askGemini(prompt, 0.85, true);
    const parsed = parseJsonResponse(result);
    if (parsed) {
      for (const [key, val] of Object.entries(parsed)) {
        allProse[key] = Array.isArray(val) ? val as string[] : [String(val)];
      }
    }
  }

  return allProse;
}

// ── Phase 3: Assembly ──

export function assembleStory(
  concept: CYOAConcept,
  prose: Record<string, string[]>,
  config: AdventureConfig,
): CYOAStory {
  const pagesData: Record<string, CYOAPage> = {};

  for (const pageInfo of concept.page_map) {
    const pid = String(pageInfo.id);
    let pageProse = prose[pid] || [];
    if (typeof pageProse === 'string') pageProse = [pageProse];

    const choices = (pageInfo.choices || []).map(c => ({
      text: c.text || 'Continue...',
      page: String(c.target || '1'),
      ...(c.item_required ? { itemRequired: c.item_required } : {}),
    }));

    pagesData[pid] = {
      text: pageProse.length ? pageProse : [pageInfo.summary || 'You continue your adventure...'],
      illustration: null,
      illustrationCaption: null,
      choices,
      isEnding: pageInfo.is_ending || false,
      endingType: pageInfo.ending_type || null,
      items: pageInfo.items_found || [],
      flags: [`visited_${pid}`],
      conditionalText: [],
    };
  }

  return {
    title: concept.title || config.story.title || 'Untitled Adventure',
    subtitle: concept.subtitle || `A ${config.cyoaGenre.name} Adventure`,
    genre: config.cyoaGenre.id,
    bookNumber: Math.floor(Math.random() * 250) + 1,
    totalPages: Object.keys(pagesData).length,
    coverIllustration: null,
    pages: pagesData,
  };
}

// ── Phase 4: QA & Auto-Fix ──

export async function phaseQA(
  story: CYOAStory,
  concept: CYOAConcept,
  onProgress?: (msg: string) => void,
): Promise<CYOAStory> {
  const pages = story.pages;

  // 1. BFS reachability — fix orphan pages
  onProgress?.('Checking graph integrity...');
  const reachable = new Set<string>();
  const queue = ['1'];
  while (queue.length > 0) {
    const pid = queue.shift()!;
    if (reachable.has(pid)) continue;
    reachable.add(pid);
    const page = pages[pid];
    if (page) {
      for (const c of page.choices) {
        if (!reachable.has(c.page)) queue.push(c.page);
      }
    }
  }

  const allIds = new Set(Object.keys(pages));
  const orphans = [...allIds].filter(id => !reachable.has(id));
  for (const orphan of orphans) {
    const candidates = [...reachable].filter(p => !pages[p]?.isEnding);
    if (candidates.length > 0) {
      const src = candidates[Math.floor(Math.random() * candidates.length)];
      pages[src].choices.push({ text: 'You notice a passage you missed before.', page: orphan });
    }
  }

  // 2. Fix broken links
  for (const [pid, page] of Object.entries(pages)) {
    for (const choice of page.choices) {
      if (!pages[choice.page]) {
        const valid = Object.keys(pages).filter(p => p !== pid);
        if (valid.length) choice.page = valid[Math.floor(Math.random() * valid.length)];
      }
    }
  }

  // 3. Fix dead-end non-ending pages
  for (const [, page] of Object.entries(pages)) {
    if (!page.isEnding && (!page.choices || page.choices.length === 0)) {
      page.isEnding = true;
      page.endingType = 'neutral';
    }
  }

  // 4. Remove impossible item gates
  onProgress?.('Verifying item gates...');
  const allItems = new Set<string>();
  for (const page of Object.values(pages)) {
    for (const item of page.items) allItems.add(item);
  }
  for (const page of Object.values(pages)) {
    for (const choice of page.choices) {
      if (choice.itemRequired && !allItems.has(choice.itemRequired)) {
        delete choice.itemRequired;
      }
    }
  }

  // 5. Verify item gates are reachable AFTER obtaining the item
  // BFS from page 1, tracking which items we've collected at each state.
  // If we reach a gate before we can possibly have the item, remove the gate.
  const itemPages = new Map<string, Set<string>>(); // item → set of page IDs where it's found
  for (const [pid, page] of Object.entries(pages)) {
    for (const item of page.items) {
      if (!itemPages.has(item)) itemPages.set(item, new Set());
      itemPages.get(item)!.add(pid);
    }
  }
  // BFS collecting items — track the earliest reachable page for each item
  const itemFirstReachable = new Map<string, number>(); // item → BFS visit order
  const visitOrder = new Map<string, number>(); // pageId → BFS order
  const bfsQueue: string[] = ['1'];
  const bfsVisited = new Set<string>();
  let bfsOrder = 0;
  while (bfsQueue.length > 0) {
    const pid = bfsQueue.shift()!;
    if (bfsVisited.has(pid)) continue;
    bfsVisited.add(pid);
    visitOrder.set(pid, bfsOrder++);
    const pg = pages[pid];
    if (!pg) continue;
    // Record items found at this page
    for (const item of pg.items) {
      if (!itemFirstReachable.has(item)) {
        itemFirstReachable.set(item, visitOrder.get(pid)!);
      }
    }
    // Follow ungated choices first (BFS naturally explores breadth-first)
    for (const c of pg.choices) {
      if (!bfsVisited.has(c.page)) bfsQueue.push(c.page);
    }
  }
  // Now check: for each gated choice, is the item obtainable before this page?
  for (const [pid, page] of Object.entries(pages)) {
    for (const choice of page.choices) {
      if (!choice.itemRequired) continue;
      const gateOrder = visitOrder.get(pid) ?? Infinity;
      const itemOrder = itemFirstReachable.get(choice.itemRequired) ?? Infinity;
      if (itemOrder >= gateOrder) {
        // Item is found at or after the gate — player can't have it yet. Remove gate.
        delete choice.itemRequired;
      }
    }
  }

  story.totalPages = Object.keys(pages).length;
  return story;
}

// ── Art Style Prefix Builder ──

function getArtStylePrefix(artStyleId: string): string {
  const styles: Record<string, string> = {
    cel_shaded: 'cel-shaded cartoon illustration, bold outlines, flat vibrant colors,',
    pixel_art: '16-bit pixel art illustration, retro gaming aesthetic, limited color palette,',
    watercolor: 'watercolor painting illustration, soft flowing brushstrokes, translucent washes,',
    noir: 'high contrast black and white illustration, dramatic shadows, film noir composition,',
    neon: 'neon-lit cyberpunk illustration, glowing edges, synthwave color palette,',
    hand_drawn: 'hand-drawn pen and ink illustration, sketchy crosshatching, pencil textures,',
    low_poly: 'low poly geometric illustration, clean flat shapes, minimalist composition,',
  };
  return styles[artStyleId] || '1970s airbrushed retro book illustration, dramatic chiaroscuro lighting,';
}

// ── Exported pipeline runner ──

export interface AdventurePipelineResult {
  story: CYOAStory;
  concept: CYOAConcept;
}

export async function runAdventurePipeline(
  config: AdventureConfig,
  sendProgress: (pct: number, msg: string, stage?: string) => void,
): Promise<AdventurePipelineResult | null> {
  const t0 = Date.now();

  // Phase 1: Concept — with heartbeat so progress doesn't freeze
  sendProgress(5, `Designing a ${config.cyoaGenre.name} story with ${config.structure.pageCount} pages...`, 'concept');
  let conceptPct = 5;
  const conceptHeartbeat = setInterval(() => {
    conceptPct = Math.min(conceptPct + 1, 14);
    const dots = '.'.repeat((conceptPct % 3) + 1);
    sendProgress(conceptPct, `Gemini is designing the story outline${dots}`, 'outline');
  }, 3000);
  const concept = await phaseConcept(config, (msg) => sendProgress(10, msg, 'outline'));
  clearInterval(conceptHeartbeat);
  if (!concept) {
    sendProgress(0, 'Failed to generate concept — Gemini did not return valid JSON');
    return null;
  }

  const elapsed1 = Math.floor((Date.now() - t0) / 1000);
  sendProgress(15, `Concept ready (${elapsed1}s): "${concept.title}" — ${concept.page_map.length} pages, ${concept.characters.length} characters`, 'outline');

  // Phase 2: Prose — smooth progress across chunks
  const totalChunks = Math.ceil(concept.page_map.length / 5);
  let chunksDone = 0;
  sendProgress(18, `Writing vivid prose for ${concept.page_map.length} pages...`, 'prose');
  const prose = await phaseProse(concept, config, (msg) => {
    // Track chunk completion from the message
    const chunkMatch = msg.match(/chunk (\d+)\/(\d+)/);
    if (chunkMatch) {
      chunksDone = parseInt(chunkMatch[1]) - 1;
    }
    // Smooth progress: 18% to 50% over all chunks
    const proseProgress = 18 + Math.floor((chunksDone / totalChunks) * 32);
    const stageId = proseProgress < 30 ? 'prose' : proseProgress < 42 ? 'prose_mid' : 'prose_final';
    sendProgress(Math.min(proseProgress, 50), msg, stageId);
  });
  const elapsed2 = Math.floor((Date.now() - t0) / 1000);
  sendProgress(50, `Prose complete (${elapsed2}s): ${Object.keys(prose).length} pages of narrative written`, 'prose_final');

  // Phase 3: Assembly
  sendProgress(55, 'Assembling story graph...', 'assembly');
  const story = assembleStory(concept, prose, config);
  const endings = Object.values(story.pages).filter(p => p.isEnding).length;
  sendProgress(60, `Story assembled: ${story.totalPages} pages, ${endings} endings`, 'assembly');

  // Phase 4: Imagen illustrations for key pages
  sendProgress(62, 'Generating illustrations with Imagen...', 'illustrations');
  const artPrefix = getArtStylePrefix(config.artStyle.id);
  const themeAtmo: Record<string, string> = {
    horror: 'dark eerie atmosphere, shadows, dim flickering light',
    fantasy: 'magical enchanted atmosphere, glowing runes, mystical energy',
    scifi: 'futuristic sci-fi atmosphere, holographic displays, sleek technology',
    mystery: 'moody detective atmosphere, warm lamplight, foggy shadows',
    cozy: 'warm cozy atmosphere, soft golden light, comfortable inviting',
    cyberpunk: 'neon-lit cyberpunk atmosphere, rain-slicked streets',
    steampunk: 'Victorian steampunk atmosphere, brass gears, steam pipes',
    postapoc: 'post-apocalyptic atmosphere, overgrown ruins, muted tones',
  };
  const themeStr = themeAtmo[config.theme.id] || 'atmospheric, cinematic lighting';
  const ANTI_IMG_TEXT = 'absolutely no text no words no letters no writing no logos no UI no signage no titles no captions';

  // Illustrate EVERY page — each page gets a small scene illustration
  const toIllustrate = Object.keys(story.pages);
  const totalImages = toIllustrate.length + 1; // +1 for cover

  // Cover illustration
  sendProgress(63, `Painting cover illustration (1/${totalImages})...`, 'illustrations');
  const coverPrompt = `${artPrefix} book cover illustration, ${concept.premise}, ${themeStr}, dramatic cinematic composition, ${ANTI_IMG_TEXT}`;
  const coverImg = await generateImage(coverPrompt, '3:4');
  if (coverImg) {
    story.coverIllustration = `data:image/png;base64,${coverImg}`;
  }

  // Interior illustrations — every page gets one
  let imgSuccess = coverImg ? 1 : 0;
  for (let i = 0; i < toIllustrate.length; i++) {
    const pid = toIllustrate[i];
    const page = story.pages[pid];
    if (!page) continue;
    // Progress: 63% to 88% spread across all images
    const pct = 63 + Math.floor(((i + 1) / totalImages) * 25);
    const pageEntry = concept.page_map.find(p => String(p.id) === pid);
    const setting = pageEntry?.setting || 'a mysterious scene';
    const summary = pageEntry?.summary || '';
    sendProgress(pct, `Illustrating page ${pid}/${toIllustrate.length}: ${setting.substring(0, 40)}...`, 'illustrations');

    const prompt = `${artPrefix} interior book illustration, scene: ${setting}, ${summary}, ${themeStr}, atmospheric scenery, ${ANTI_IMG_TEXT}`;
    const img = await generateImage(prompt, '4:3');
    if (img) {
      page.illustration = `data:image/png;base64,${img}`;
      page.illustrationCaption = setting;
      imgSuccess++;
    }
  }
  sendProgress(88, `Illustrations complete: ${imgSuccess}/${totalImages} images generated`, 'illustrations');

  // Phase 5: QA & auto-fix
  sendProgress(89, 'Checking graph integrity...', 'qa_graph');
  const fixedStory = await phaseQA(story, concept, (msg) => {
    if (msg.includes('item gates')) {
      sendProgress(93, msg, 'qa_items');
    } else {
      sendProgress(91, msg, 'qa_graph');
    }
  });

  sendProgress(95, `QA complete — verifying endings...`, 'qa_endings');
  sendProgress(96, 'Building interactive viewer...', 'viewer');

  const elapsed = Math.floor((Date.now() - t0) / 1000);
  sendProgress(98, `Forge complete in ${elapsed}s: "${fixedStory.title}" — ${fixedStory.totalPages} pages, ${endings} endings`, 'complete');

  return { story: fixedStory, concept };
}
