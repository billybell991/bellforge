// ── AI Comics Pipeline ──
// Generates a complete comic book via Gemini + Imagen
// Cover: 100% Gemini (title + comic chrome, NO ANTI_TEXT)
// Interior: Per-PANEL Imagen illustrations (scene art, ANTI_TEXT) + HTML dialogue overlays

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ComicConfig } from './pipeline/types.js';
import { generateImage } from './imagen.js';

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
  dialogue: { speaker: string; text: string; type: 'speech' | 'thought' | 'narration'; speakerPosition?: 'left' | 'right' | 'center' }[];
}

export interface ComicPage {
  pageNumber: number;
  setting: string;
  panels: ComicPanel[];
  isCover: boolean;
  pageIllustration?: string;
}

export interface ComicPanel {
  panelNumber: number;
  artDirection: string;
  illustration: string | null;
  dialogue: { speaker: string; text: string; type: 'speech' | 'thought' | 'narration'; speakerPosition?: 'left' | 'right' | 'center' }[];
}

export interface ComicStory {
  title: string;
  subtitle: string;
  genre: string;
  issueNumber: number;
  totalPages: number;
  coverPage: ComicPage | null;
  coverIllustration?: string;
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
    cel_shaded: 'cel-shaded comic book illustration, bold black outlines, flat vibrant colors, clean line art,',
    pixel_art: 'pixel art comic panels, retro 16-bit aesthetic, limited color palette, crisp edges,',
    watercolor: 'watercolor comic illustration, soft flowing brushstrokes, translucent washes, inked outlines,',
    noir: 'high contrast black and white comic art, heavy ink shadows, film noir, halftone patterns,',
    neon: 'neon-lit cyberpunk comic art, glowing edges, synthwave colors, bold black outlines,',
    hand_drawn: 'hand-drawn pen and ink comic art, crosshatching, pencil textures, clean line art,',
    low_poly: 'flat geometric comic art, clean lines, minimalist compositions, bold outlines,',
  };
  return styles[artStyleId] || 'professional comic book illustration, bold black outlines, clean line art, dynamic composition,';
}

// ── Phase 1a: Concept & Story Outline (lightweight — no panel scripts) ──

interface PageOutline {
  pageNumber: number;
  setting: string;
  description: string;
}

export async function phaseConceptOutline(
  config: ComicConfig,
  onProgress?: (msg: string) => void,
): Promise<{ concept: ComicConcept; outline: PageOutline[] } | null> {
  const genre = config.comicGenre.name;
  const themeName = config.theme.name;
  const pageCount = config.structure.pageCount;
  const tone = config.structure.tone;
  const storySeed = config.story.description || '';
  const characterName = config.story.characterName || '';
  const title = config.story.title || '';

  const seedLine = storySeed ? `\nStory seed: "${storySeed}"` : '';
  const charLine = characterName ? `\nProtagonist name: "${characterName}"` : '';
  const titleLine = title ? `\nTitle: "${title}"` : '';

  onProgress?.('Designing concept, characters, and story arc...');

  const prompt = `You are a master comic book writer. Design the concept and story outline for a comic book.

Story type: ${genre}
The comic has exactly ${pageCount} interior pages.
Theme/atmosphere: ${themeName}
Tone: ${tone}
${titleLine}${charLine}${seedLine}

Output valid JSON with the concept and a one-line-per-page outline (NO panel scripts — those come later):
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
  "outline": [
    { "pageNumber": 1, "setting": "Location description", "description": "What happens on this page (one sentence)" }
  ]
}

CRITICAL RULES:
- The visualDescription for each character must be hyper-specific and consistent — it will be pasted verbatim into EVERY art prompt
- Story should have a clear arc: hook → escalation → climax → resolution
- outline must have exactly ${pageCount} entries
- Keep outline descriptions short — just enough to convey what happens

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

  const outline = (parsed.outline as unknown as PageOutline[]) || [];

  return { concept, outline };
}

// ── Phase 1b: Detailed Panel Scripts (chunked — 4 pages per call) ──

export async function phasePanelScripts(
  concept: ComicConcept,
  outline: PageOutline[],
  config: ComicConfig,
  onProgress?: (msg: string, batchIdx: number, totalBatches: number) => void,
): Promise<ComicBeat[]> {
  const allBeats: ComicBeat[] = [];
  const BATCH_SIZE = 4;
  const totalBatches = Math.ceil(outline.length / BATCH_SIZE);

  const charBlock = [
    `Protagonist: ${concept.protagonist.name} — ${concept.protagonist.visualDescription}`,
    ...concept.characters.map(c => `${c.name} (${c.role}): ${c.visualDescription}`),
  ].join('\n');

  for (let i = 0; i < outline.length; i += BATCH_SIZE) {
    const batch = outline.slice(i, i + BATCH_SIZE);
    const batchIdx = Math.floor(i / BATCH_SIZE);
    const pageRange = batch.length === 1 ? `page ${batch[0].pageNumber}` : `pages ${batch[0].pageNumber}-${batch[batch.length - 1].pageNumber}`;
    onProgress?.(`Writing detailed scripts for ${pageRange}...`, batchIdx, totalBatches);

    const prompt = `You are scripting panel-by-panel layouts for a ${config.comicGenre.name} comic called "${concept.title}".

Characters:
${charBlock}

Story outline for these pages:
${batch.map(p => `Page ${p.pageNumber}: [${p.setting}] ${p.description}`).join('\n')}

For each page, write exactly 3 panels with detailed art direction and dialogue.

Output valid JSON array:
[
  {
    "pageNumber": ${batch[0].pageNumber},
    "setting": "Location description",
    "description": "What happens on this page",
    "panels": [
      {
        "panelNumber": 1,
        "artDirection": "Detailed visual description of what to draw (camera angle, composition, action, lighting, character poses). Describe the SCENE, not the art style.",
        "characters": ["Character Name"],
        "dialogue": [
          {"speaker": "Character Name", "text": "Dialogue line", "type": "speech", "speakerPosition": "left"}
        ]
      }
    ]
  }
]

RULES:
- Exactly 3 panels per page: one establishing/wide shot, one mid/action shot, one close-up/reaction shot
- "speech" for speech bubbles, "thought" for thought bubbles, "narration" for caption boxes
- speakerPosition: where the speaker is in the panel art ("left", "right", or "center") — bubbles will be placed on the OPPOSITE side
- In artDirection, position characters on the side matching their speakerPosition (e.g. if speakerPosition is "left", describe the character on the left side of the panel)
- Keep dialogue punchy — 1-2 short sentences per bubble max
- Art direction should be vivid and specific about composition, not style

Output ONLY the JSON array.`;

    const result = await askGemini(prompt, 0.85, true);
    if (result) {
      try {
        let cleaned = result.trim();
        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
        // Parse as array
        let parsed: ComicBeat[];
        if (cleaned.startsWith('[')) {
          parsed = JSON.parse(cleaned) as ComicBeat[];
        } else {
          const obj = JSON.parse(cleaned) as Record<string, unknown>;
          // Sometimes Gemini wraps in an object
          parsed = (obj.pages || obj.beats || [obj]) as ComicBeat[];
        }
        allBeats.push(...parsed);
      } catch {
        // If parsing fails, create stubs from the outline batch
        for (const p of batch) {
          allBeats.push({
            pageNumber: p.pageNumber,
            setting: p.setting,
            description: p.description,
            panels: [{
              panelNumber: 1,
              artDirection: `Wide establishing shot of ${p.setting}. ${p.description}`,
              characters: [concept.protagonist.name],
              dialogue: [{ speaker: '', text: p.description, type: 'narration' as const }],
            }],
          });
        }
      }
    } else {
      // Gemini failed entirely — stub from outline
      for (const p of batch) {
        allBeats.push({
          pageNumber: p.pageNumber,
          setting: p.setting,
          description: p.description,
          panels: [{
            panelNumber: 1,
            artDirection: `Wide establishing shot of ${p.setting}. ${p.description}`,
            characters: [concept.protagonist.name],
            dialogue: [{ speaker: '', text: p.description, type: 'narration' as const }],
          }],
        });
      }
    }
  }

  return allBeats;
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

  // Phase 1a: Concept + story outline (lightweight — small JSON)
  sendProgress(5, `Crafting a ${config.comicGenre.name} comic concept...`, 'story');
  const outlineResult = await phaseConceptOutline(config, (msg) => sendProgress(8, msg, 'story'));
  if (!outlineResult) {
    sendProgress(0, 'Failed to generate comic concept — Gemini did not return valid JSON');
    return null;
  }
  const { concept, outline } = outlineResult;

  const elapsed1 = Math.floor((Date.now() - t0) / 1000);
  sendProgress(12, `Concept ready (${elapsed1}s): "${concept.title}" — ${outline.length} pages, ${concept.characters.length + 1} characters`, 'story');

  // Phase 1b: Detailed panel scripts (chunked — 4 pages per Gemini call)
  sendProgress(15, `Writing panel scripts for ${outline.length} pages...`, 'script');
  const beats = await phasePanelScripts(concept, outline, config, (msg, batchIdx, totalBatches) => {
    const pct = 15 + Math.floor(((batchIdx + 1) / totalBatches) * 12);
    sendProgress(pct, msg, 'script');
  });

  const elapsed2 = Math.floor((Date.now() - t0) / 1000);
  sendProgress(28, `Scripts complete (${elapsed2}s): ${beats.length} pages fully scripted`, 'layouts');

  // Phase 2: Assembly
  sendProgress(30, 'Designing page layouts...', 'layouts');
  const story = assembleComic(concept, beats, config);
  const totalPanels = story.pages.reduce((sum, p) => sum + p.panels.length, 0);
  sendProgress(32, `Assembled: ${story.totalPages} pages, ${totalPanels} panels`, 'layouts');

  // Phase 3: Art generation via Imagen
  // Per-panel illustrations: simple scene art with ANTI_TEXT (no text/bubbles).
  // HTML viewer handles multi-panel grid layout + dialogue overlays via CSS.
  // Cover: 100% Gemini composition with title text, NO ANTI_TEXT.
  const artPrefix = getArtStylePrefix(config.artStyle.id);
  // Style anchor — stays identical across every panel for visual consistency
  const styleAnchor = `${artPrefix} white gutters, cinematic lighting`;
  const charBlock = [
    `${concept.protagonist.name}: ${concept.protagonist.visualDescription}`,
    ...concept.characters.map(c => `${c.name}: ${c.visualDescription}`),
  ].join('. ');

  // 3a: Cover — NO ANTI_TEXT, Gemini renders title + comic book design elements
  sendProgress(35, 'Generating cover artwork...', 'cover_art');
  const coverPrompt = `${styleAnchor} Design this as a complete, professional comic book cover that looks like an authentic published comic book. Include ALL standard comic cover elements: publisher logo box, issue number, barcode, price stamp. The title of the comic is "${concept.title}" — render it prominently. ${concept.protagonist.visualDescription} should dominate the composition in a dramatic pose. The title should NOT cover the hero's face.`;
  const coverImg = await generateImage(coverPrompt, '3:4');
  if (coverImg) {
    story.coverIllustration = `data:image/png;base64,${coverImg}`;
  }
  sendProgress(40, coverImg ? 'Cover artwork generated' : 'Cover generation failed — using fallback', 'cover_art');

  // 3b: Interior panels — individual panel illustrations (scene art only)
  // ANTI_TEXT keeps panels clean of AI-hallucinated text; HTML viewer overlays
  // dialogue bubbles, thought bubbles, and narration boxes via CSS.
  const totalPanelImages = story.pages.reduce((sum, p) => sum + p.panels.length, 0);
  let panelsDone = 0;
  let imagesGenerated = 0;

  for (let i = 0; i < story.pages.length; i++) {
    const page = story.pages[i];

    for (let j = 0; j < page.panels.length; j++) {
      const panel = page.panels[j];
      panelsDone++;
      const pct = 42 + Math.floor((panelsDone / totalPanelImages) * 28);
      sendProgress(pct, `Drawing panel ${panelsDone}/${totalPanelImages} (page ${i + 1})...`, 'panel_art');

      // Focus character references on who actually appears in this panel
      const panelCharNames = [...new Set(
        (panel.dialogue || []).filter(d => d.speaker && d.type !== 'narration').map(d => d.speaker)
      )];
      const charRef = panelCharNames.length > 0
        ? `Characters visible: ${panelCharNames.join(', ')}. ${charBlock}`
        : charBlock;

      const panelPrompt = `${styleAnchor} single comic book panel illustration. ${panel.artDirection}. Setting: ${page.setting}. ${charRef}. No text, no speech bubbles, no captions. ${ANTI_TEXT}`;
      const panelImg = await generateImage(panelPrompt, '4:3');
      if (panelImg) {
        panel.illustration = `data:image/png;base64,${panelImg}`;
        imagesGenerated++;
      }

      // Throttle between panels
      if (panelsDone < totalPanelImages) await sleep(1500);
    }
  }
  sendProgress(70, `Art complete: ${imagesGenerated}/${totalPanelImages} panel illustrations generated`, 'panel_art');

  sendProgress(75, 'Finalizing pages...', 'text_overlay');

  // Phase 5: QA
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
