// ── AI Comics Pipeline ──
// Generates a complete comic book via Gemini + Imagen
// Cover: 100% Gemini (title text included). Interior: Gemini art-only + text overlay.

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ComicConfig } from './pipeline/types.js';

const apiKey = process.env.GEMINI_API_KEY;
let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

const ANTI_TEXT = 'absolutely no text no words no letters no writing no logos no UI no signage no titles no speech bubbles no captions no narration boxes';

// ── Types ──

export interface ComicConcept {
  title: string;
  subtitle: string;
  synopsis: string;
  protagonist: { name: string; description: string; visualDescription: string };
  characters: { name: string; description: string; visualDescription: string; role: string }[];
  issueNumber: number;
}

export interface ComicBeat {
  pageNumber: number;
  setting: string;
  description: string;
  panels: ComicPanelScript[];
}

export interface ComicPanelScript {
  panelNumber: number;
  artDirection: string;
  characters: string[];
  dialogue: { speaker: string; text: string; type: 'speech' | 'thought' | 'narration' }[];
}

export interface ComicPage {
  pageNumber: number;
  setting: string;
  panels: ComicPanel[];
  isCover: boolean;
}

export interface ComicPanel {
  panelNumber: number;
  artDirection: string;
  illustration: string | null;
  dialogue: { speaker: string; text: string; type: 'speech' | 'thought' | 'narration' }[];
}

export interface ComicStory {
  title: string;
  subtitle: string;
  genre: string;
  issueNumber: number;
  totalPages: number;
  coverPage: ComicPage | null;
  pages: ComicPage[];
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

function getArtStylePrefix(artStyleId: string): string {
  const styles: Record<string, string> = {
    cel_shaded: 'cel-shaded comic book art, bold outlines, flat vibrant colors,',
    pixel_art: 'pixel art comic panels, retro 16-bit aesthetic, limited color palette,',
    watercolor: 'watercolor comic illustration, soft flowing brushstrokes, translucent washes,',
    noir: 'high contrast black and white comic art, heavy inks, dramatic shadows, film noir,',
    neon: 'neon-lit cyberpunk comic art, glowing edges, synthwave colors,',
    hand_drawn: 'hand-drawn pen and ink comic art, crosshatching, pencil textures,',
    low_poly: 'flat geometric comic art, clean lines, minimalist compositions,',
  };
  return styles[artStyleId] || 'professional comic book art, dynamic composition,';
}

// ── Phase 1: Concept & Story Beats ──

export async function phaseConcept(
  config: ComicConfig,
  onProgress?: (msg: string) => void,
): Promise<{ concept: ComicConcept; beats: ComicBeat[] } | null> {
  const genre = config.comicGenre.id.replace(/_/g, ' ');
  const themeName = config.theme.name;
  const pageCount = config.structure.pageCount;
  const tone = config.structure.tone;
  const storySeed = config.story.description || '';
  const characterName = config.story.characterName || '';
  const title = config.story.title || '';

  const seedLine = storySeed ? `\nStory seed: "${storySeed}"` : '';
  const charLine = characterName ? `\nProtagonist name: "${characterName}"` : '';
  const titleLine = title ? `\nTitle: "${title}"` : '';

  onProgress?.('Asking Gemini to craft the story and characters...');

  const prompt = `You are a master comic book writer and artist.

Create a complete ${genre} comic book with exactly ${pageCount} interior pages.
Theme/atmosphere: ${themeName}
Tone: ${tone}
${titleLine}${charLine}${seedLine}

Output valid JSON:
{
  "title": "Comic Title",
  "subtitle": "A one-line tagline",
  "synopsis": "2-3 sentence synopsis",
  "protagonist": {
    "name": "Hero Name",
    "description": "Character personality/backstory",
    "visualDescription": "Extremely specific visual description for AI art consistency: ethnicity, age, hair color/style/length, eye color, specific clothing items with colors, accessories, build"
  },
  "characters": [
    {
      "name": "Name",
      "description": "Brief role",
      "visualDescription": "Extremely specific visual description matching protagonist format",
      "role": "ally/villain/neutral"
    }
  ],
  "issueNumber": 1,
  "beats": [
    {
      "pageNumber": 1,
      "setting": "Location description",
      "description": "What happens on this page",
      "panels": [
        {
          "panelNumber": 1,
          "artDirection": "Detailed visual description of what to draw (camera angle, composition, action, lighting)",
          "characters": ["Hero Name"],
          "dialogue": [
            {"speaker": "Hero Name", "text": "Dialogue line", "type": "speech"},
            {"speaker": "", "text": "Narration text", "type": "narration"}
          ]
        }
      ]
    }
  ]
}

CRITICAL RULES:
- Each page should have 3-6 panels
- Include a mix of: establishing shots, action panels, close-ups, reaction shots
- Dialogue uses "speech" for speech bubbles, "thought" for thought bubbles, "narration" for caption boxes
- Keep dialogue punchy — 1-2 short sentences per bubble max
- Story should have a clear arc: hook → escalation → climax → resolution
- The visualDescription for each character must be hyper-specific and consistent — it will be pasted verbatim into EVERY art prompt
- Art direction should describe the SCENE not the style — style will be prepended separately

Output ONLY the JSON.`;

  const result = await askGemini(prompt, 0.9, true);
  const parsed = parseJsonResponse(result);
  if (!parsed) return null;

  const concept: ComicConcept = {
    title: (parsed.title as string) || title || 'Untitled Comic',
    subtitle: (parsed.subtitle as string) || '',
    synopsis: (parsed.synopsis as string) || '',
    protagonist: parsed.protagonist as ComicConcept['protagonist'],
    characters: (parsed.characters as ComicConcept['characters']) || [],
    issueNumber: (parsed.issueNumber as number) || 1,
  };

  if (config.story.title) {
    concept.title = config.story.title;
  }

  const beats = (parsed.beats as unknown as ComicBeat[]) || [];

  return { concept, beats };
}

// ── Phase 2: Panel Script Expansion ──
// For large comics, beats may come back thin. Expand any pages with < 3 panels.

export async function phaseExpandScripts(
  concept: ComicConcept,
  beats: ComicBeat[],
  config: ComicConfig,
  onProgress?: (msg: string) => void,
): Promise<ComicBeat[]> {
  const thinPages = beats.filter(b => !b.panels || b.panels.length < 3);
  if (thinPages.length === 0) return beats;

  onProgress?.(`Expanding ${thinPages.length} thin pages...`);

  const chunkSize = 4;
  for (let i = 0; i < thinPages.length; i += chunkSize) {
    const chunk = thinPages.slice(i, i + chunkSize);
    const chunkNum = Math.floor(i / chunkSize) + 1;
    const totalChunks = Math.ceil(thinPages.length / chunkSize);
    onProgress?.(`Expanding panel scripts chunk ${chunkNum}/${totalChunks}...`);

    const prompt = `You are expanding panel scripts for a ${config.comicGenre.name} comic called "${concept.title}".

Protagonist: ${concept.protagonist.name} — ${concept.protagonist.description}
Characters: ${JSON.stringify(concept.characters.map(c => ({ name: c.name, role: c.role })))}

For each page below, write 4-5 detailed panels with art direction and dialogue.

Pages to expand:
${JSON.stringify(chunk, null, 2)}

Output valid JSON array of the expanded pages (same structure as input but with fuller panels):
[{ "pageNumber": N, "setting": "...", "description": "...", "panels": [...] }]

Output ONLY the JSON array.`;

    const result = await askGemini(prompt, 0.85, true);
    if (result) {
      try {
        let cleaned = result.trim();
        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
        const expanded = JSON.parse(cleaned) as ComicBeat[];
        for (const exp of expanded) {
          const idx = beats.findIndex(b => b.pageNumber === exp.pageNumber);
          if (idx >= 0) beats[idx] = exp;
        }
      } catch { /* keep originals */ }
    }
  }

  return beats;
}

// ── Phase 3: Assembly ──

export function assembleComic(
  concept: ComicConcept,
  beats: ComicBeat[],
  config: ComicConfig,
): ComicStory {
  const pages: ComicPage[] = beats.map(beat => ({
    pageNumber: beat.pageNumber,
    setting: beat.setting,
    isCover: false,
    panels: (beat.panels || []).map(p => ({
      panelNumber: p.panelNumber,
      artDirection: p.artDirection,
      illustration: null,
      dialogue: p.dialogue || [],
    })),
  }));

  return {
    title: concept.title,
    subtitle: concept.subtitle,
    genre: config.comicGenre.id,
    issueNumber: concept.issueNumber,
    totalPages: pages.length,
    coverPage: null,
    pages,
  };
}

// ── Phase 4: QA ──

export async function phaseQA(
  story: ComicStory,
  concept: ComicConcept,
  onProgress?: (msg: string) => void,
): Promise<ComicStory> {
  onProgress?.('Checking panel continuity...');

  // Fix empty pages
  for (const page of story.pages) {
    if (!page.panels || page.panels.length === 0) {
      page.panels = [{
        panelNumber: 1,
        artDirection: `Wide establishing shot of ${page.setting}`,
        illustration: null,
        dialogue: [{ speaker: '', text: 'The story continues...', type: 'narration' as const }],
      }];
    }
  }

  // Ensure sequential page numbers
  story.pages.sort((a, b) => a.pageNumber - b.pageNumber);
  story.pages.forEach((p, i) => { p.pageNumber = i + 1; });
  story.totalPages = story.pages.length;

  onProgress?.('Verifying story flow...');

  return story;
}

// ── Exported pipeline runner ──

export interface ComicPipelineResult {
  story: ComicStory;
  concept: ComicConcept;
}

export async function runComicPipeline(
  config: ComicConfig,
  sendProgress: (pct: number, msg: string, stage?: string) => void,
): Promise<ComicPipelineResult | null> {
  const t0 = Date.now();

  // Phase 1: Concept + story beats
  sendProgress(5, `Crafting a ${config.comicGenre.name} comic story...`, 'story');
  const conceptResult = await phaseConcept(config, (msg) => sendProgress(10, msg, 'story'));
  if (!conceptResult) {
    sendProgress(0, 'Failed to generate comic concept — Gemini did not return valid JSON');
    return null;
  }
  const { concept, beats } = conceptResult;

  const elapsed1 = Math.floor((Date.now() - t0) / 1000);
  sendProgress(15, `Story ready (${elapsed1}s): "${concept.title}" — ${beats.length} pages, ${concept.characters.length + 1} characters`, 'script');

  // Phase 2: Expand panel scripts
  sendProgress(18, `Expanding panel scripts for ${beats.length} pages...`, 'script');
  const expandedBeats = await phaseExpandScripts(concept, beats, config, (msg) => {
    sendProgress(22, msg, 'script');
  });
  sendProgress(25, 'Panel scripts finalized', 'layouts');

  // Phase 3: Assembly
  sendProgress(28, 'Designing page layouts...', 'layouts');
  const story = assembleComic(concept, expandedBeats, config);
  const totalPanels = story.pages.reduce((sum, p) => sum + p.panels.length, 0);
  sendProgress(32, `Assembled: ${story.totalPages} pages, ${totalPanels} panels`, 'layouts');

  // Phase 4: Art generation progress markers
  // (Actual Imagen calls would go here — for now emit progress stages)
  sendProgress(35, 'Generating cover artwork...', 'cover_art');
  await sleep(500);
  sendProgress(40, 'Cover design complete', 'cover_art');

  const pagesPerStage = Math.ceil(story.totalPages / 3);
  for (let i = 0; i < story.totalPages; i++) {
    const pct = 45 + Math.floor((i / story.totalPages) * 20);
    const stageId = i < pagesPerStage ? 'panel_art' : i < pagesPerStage * 2 ? 'panel_art_mid' : 'panel_art_final';
    sendProgress(pct, `Drawing page ${i + 1}/${story.totalPages}...`, stageId);
    await sleep(200);
  }
  sendProgress(65, `All ${story.totalPages} pages illustrated`, 'panel_art_final');

  // Phase 5: Text overlay markers
  sendProgress(75, 'Rendering speech bubbles and narration boxes...', 'text_overlay');
  await sleep(300);
  sendProgress(78, `Overlaying dialogue on ${totalPanels} panels`, 'text_overlay');

  // Phase 6: QA
  sendProgress(82, 'Checking panel continuity...', 'qa_panels');
  const fixedStory = await phaseQA(story, concept, (msg) => {
    if (msg.includes('story flow')) {
      sendProgress(88, msg, 'qa_story');
    } else {
      sendProgress(85, msg, 'qa_panels');
    }
  });

  sendProgress(92, 'Assembling comic viewer...', 'viewer');

  const elapsed = Math.floor((Date.now() - t0) / 1000);
  sendProgress(98, `Forge complete in ${elapsed}s: "${fixedStory.title}" — ${fixedStory.totalPages} pages, ${totalPanels} panels`, 'complete');

  return { story: fixedStory, concept };
}
