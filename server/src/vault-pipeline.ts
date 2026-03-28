// ── Tales From The Forge — Horror Anthology Comic Pipeline ──
// Generates a 10-panel EC Comics-style horror short with The Bellman as host.
// Structure: Cover + 2 pages (5 panels each). Always horror. Fixed art style.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateImage } from './imagen.js';

// ── Types ──

export type SinType = 'greed' | 'betrayal' | 'cruelty' | 'hubris' | 'lust' | 'cowardice';

export interface VaultConfig {
  premise: string;
  sinType: SinType;
}

export interface VaultDialogue {
  speaker: string;
  text: string;
  type: 'speech' | 'thought' | 'narration';
}

export interface VaultPanel {
  panelNumber: number;
  isHostPanel: boolean;
  artDirection: string;
  illustration: string | null;
  dialogue: VaultDialogue[];
}

export interface VaultPage {
  pageNumber: number;
  panels: VaultPanel[];
}

export interface VaultStory {
  title: string;
  subtitle: string;
  sinType: SinType;
  issueNumber: number;
  coverIllustration?: string;
  pages: VaultPage[];
}

// ── Gemini setup ──

const apiKey = process.env.GEMINI_API_KEY;
let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
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

async function askGemini(prompt: string, temperature = 0.9): Promise<string | null> {
  if (!model) return null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
        } as Parameters<typeof model.generateContent>[0] extends { generationConfig?: infer G } ? G : never,
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

// ── Art direction constants ──

const THE_BELLMAN_VISUAL = `The Bellman: a skeletal figure wearing a blacksmith's heavy leather apron over Victorian mortician's clothes (black frock coat, bone-white cravat), pristine white gloves, a rakishly-tilted top hat with a black feather, deep-set glowing amber eyes in hollow sockets, a grin of too many jagged yellow teeth, gaunt elongated fingers. His domain is a crypt-forge: rough stone walls illuminated by the hellish glow of a massive iron furnace, rusted anvils on stone floors, heavy chains hanging from oak beams, thick cobwebs in every corner, floating candles in iron sconces, leather-bound tomes stacked on shelves made of bones.`;

const EC_COMICS_STYLE = `vintage EC Comics horror illustration in the style of Jack Davis and Graham Ingels, dense crosshatching with scratchy energetic pen-and-ink line work, dramatic chiaroscuro with heavy oppressive black shadows, muted desaturated palette dominated by sickly bile greens, deep blood reds, aged tobacco yellows, sepia browns, and bone whites, expressionistic horror with exaggerated facial expressions, grotesque detail work, the atmosphere of moral rot and impending doom`;

const SIN_PUNISHMENT_GUIDE: Record<SinType, string> = {
  greed: `The protagonist is consumed, entombed, or physically crushed by the very wealth or objects they craved. Gold pours down their throat. Their vault becomes their tomb. Their possessions animate and devour them. The more they hoarded, the more completely it destroys them.`,
  betrayal: `Every person they betrayed abandons them at their most desperate moment — perfectly mirroring each act of treachery. They are utterly alone when the monster comes. No one answers their cries, because they taught the world that loyalty is for fools. The final betrayal is the universe's own.`,
  cruelty: `They become the exact victim of the identical cruelty they inflicted — but multiplied tenfold. The power dynamic inverts completely. They experience every humiliation, every fear, every wound they caused to others, now from the receiving end — and it is far worse than they ever allowed themselves to understand.`,
  hubris: `Their own greatest achievement, their master plan, or the thing they were most proud of becomes the direct instrument of their destruction. Their overconfidence is weaponized against them with surgical precision. The higher they climbed on their own vanity, the further and more spectacular the fall.`,
  lust: `The object of their obsession transforms into a trap. They receive exactly what they chased — but it is not what they imagined, and now it chases them in turn. The thing they objectified and pursued becomes the captor, and they become the captive, unable to escape what they once could not stop wanting.`,
  cowardice: `Every person they abandoned when they had the chance to act is now gone — all exits sealed, all allies destroyed by the protagonist's own inaction. They face the one thing they have run from their entire life in absolute isolation, with no one left to call. Their cowardice guaranteed the very fate they spent a lifetime avoiding.`,
};

// ── Prompt builder ──

function buildScriptPrompt(config: VaultConfig): string {
  return `You are scripting a 20-panel horror comic story for "Tales From The Forge" — an EC Comics-style horror anthology in the tradition of Tales from the Crypt and Vault of Horror. Every story ends with brutal poetic justice: the protagonist's moral sin is turned against them in the most fitting, ironic, and gruesome way imaginable.

THE BELLMAN (HOST):
${THE_BELLMAN_VISUAL}

NARRATIVE STRUCTURE — EXACTLY 20 PANELS, IN THIS ORDER:

PANEL 1 — THE BELLMAN OPENS: The Bellman addresses the reader directly from his crypt-forge. He introduces today's tale with theatrical dark relish, using slightly archaic formal language. Must end on a hook that makes the reader lean in. He is amused, superior, and savoring what is about to happen.

PANELS 2-6 — ESTABLISH THE SIN: Introduce the protagonist fully. Show their sin of "${config.sinType}" through visceral action, revealing dialogue, and concrete consequences on others. These 5 panels must make us understand exactly who this person is and what they are willing to do. Not cartoony — real, recognizable, and morally ugly. We must feel the weight of what they are choosing.

PANELS 7-11 — THE DESCENT BEGINS: The protagonist's sin escalates further. They double down. Each panel shows the sin compounding — they hurt more people, dig deeper, grow more brazen. The first hairline cracks appear: something is subtly wrong, a warning they dismiss. Build creeping unease without revealing the punishment yet.

PANELS 12-16 — THE RECKONING: The horror closes in. The cracks become chasms. Every choice is now coming back — mirrored, magnified, inescapable. The protagonist begins to realize the trap but cannot stop it. Atmosphere of mounting, suffocating dread. Each panel darker and more desperate than the last.

PANELS 17-19 — THE PUNISHMENT: Horrific, ironic, poetic justice in full. The punishment DIRECTLY MIRRORS the sin — the same mechanism, the same dynamic, only now they are on the receiving end and there is no escape. It must feel inevitable, deeply unsettling, and deeply fitting. No mercy. No escape. No redemption. The punishment should feel grotesque and perfect in equal measure.

PANEL 20 — THE BELLMAN CLOSES: The Bellman delivers his verdict with grim theatrical satisfaction from his crypt-forge. He addresses the reader directly, pronounces judgment on the sinner, and invites them back for another tale. Sign off in character — archaic, smug, and utterly delighted by what just happened.

PREMISE: ${config.premise}
SIN TYPE: ${config.sinType}

POETIC JUSTICE GUIDE — this is HOW the punishment must specifically manifest:
${SIN_PUNISHMENT_GUIDE[config.sinType]}

TONE REQUIREMENTS:
- Relentlessly dark, gothic, and morally stark throughout — no lightness
- What characters DON'T say matters as much as what they do
- Build dread through implication and atmosphere — not just gore
- The Bellman's narration must feel distinct: theatrical, archaic, deeply pleased with the outcome
- Dialogue should be spare and revealing — every line tells us something about who these people really are

ART DIRECTION REQUIREMENTS:
- Each panel's artDirection must be a vivid, detailed paragraph describing the exact visual composition for an image AI
- EC Comics art style: ${EC_COMICS_STYLE}
- For Bellman panels (1 and 20), always show him in his crypt-forge setting with full detail
- Specify: character expressions (exaggerated for horror impact), lighting (always dramatic chiaroscuro), spatial relationships, camera angle (use extreme angles for horror: low-angle authority, high-angle vulnerability, extreme close-ups for terror)
- Make the visuals carry maximum horror: things lurking at panel edges, deep oppressive shadows, faces showing the full weight of dread

Respond with ONLY valid JSON — no preamble, no explanation, no markdown:
{
  "title": "Short punchy EC Comics title (e.g. 'The Weight of Gold' or 'Every Scar Returns')",
  "subtitle": "A tagline or episode subtitle (e.g. 'In Which Justice Finds Its Perfect Instrument')",
  "issueNumber": 1,
  "panels": [
    {
      "panelNumber": 1,
      "isHostPanel": true,
      "artDirection": "Full detailed art direction for this panel",
      "dialogue": [
        { "speaker": "THE BELLMAN", "text": "Welcome, curious soul...", "type": "narration" }
      ]
    }
  ]
}`;
}

function buildCoverPrompt(title: string, premise: string, sinType: SinType): string {
  const sinMood: Record<SinType, string> = {
    greed: 'a figure drowning in gold coins and wealth, eyes wide with desperate horror as possessions crush them',
    betrayal: 'a lone figure surrounded by the shadowy outlines of those they abandoned, reaching out for help that will not come',
    cruelty: 'a figure experiencing the return of every cruelty they inflicted, the hunter become the hunted',
    hubris: 'a figure consumed by their own greatest creation as it turns against its maker',
    lust: 'a figure ensnared and imprisoned by the thing they once desperately chased',
    cowardice: 'a figure utterly alone facing their deepest fear with every exit sealed behind them',
  };
  return `${EC_COMICS_STYLE}, horror anthology comic book cover composition. Scene: ${sinMood[sinType]}. Premise context: ${premise}. Composition must fill the frame dramatically — a central horrifying image with deep shadows vignetting the edges, blood red highlights, sickly green atmospheric glow. ${THE_BELLMAN_VISUAL} lurks at one edge of the image, a tiny watching figure with gleaming amber eyes and a too-wide grin, observing the doom with satisfaction. Maximum horror impact. NO TEXT NO WORDS NO LETTERS NO NUMBERS — pure illustrated horror only. ${EC_COMICS_STYLE}.`;
}

function buildPanelPrompt(panel: { artDirection: string; isHostPanel: boolean }): string {
  const hostContext = panel.isHostPanel
    ? `Setting: The Bellman's crypt-forge. ${THE_BELLMAN_VISUAL} `
    : '';
  return `${EC_COMICS_STYLE}, single horror comic panel. ${hostContext}${panel.artDirection} The image must carry maximum emotional and horror weight. NO TEXT NO WORDS NO LETTERS NO SPEECH BUBBLES NO CAPTIONS — pure EC Comics horror illustration only. ${EC_COMICS_STYLE}.`;
}

// ── Pipeline ──

type ProgressCallback = (pct: number, msg: string, stage: string) => void;

export async function runVaultPipeline(
  config: VaultConfig,
  onProgress?: ProgressCallback,
): Promise<VaultStory | null> {

  // Step 1: Gemini generates the full script
  onProgress?.(5, '🪦 The Bellman is scribing your tale of ' + config.sinType + '...', 'vault_concept');
  const scriptText = await askGemini(buildScriptPrompt(config), 0.9);
  const scriptData = parseJsonResponse(scriptText) as {
    title: string;
    subtitle: string;
    issueNumber: number;
    panels: {
      panelNumber: number;
      isHostPanel: boolean;
      artDirection: string;
      dialogue: VaultDialogue[];
    }[];
  } | null;

  if (!scriptData?.panels?.length) {
    console.error('[Vault] Gemini failed to produce a script');
    return null;
  }

  // Ensure exactly 20 panels
  const panelScripts = scriptData.panels.slice(0, 20);
  while (panelScripts.length < 20) {
    panelScripts.push({
      panelNumber: panelScripts.length + 1,
      isHostPanel: false,
      artDirection: `Dark atmospheric EC Comics horror scene, muted palette, heavy shadows, expressionistic dread`,
      dialogue: [],
    });
  }

  // Force host panel flags on panels 1 and 20
  panelScripts[0].isHostPanel = true;
  panelScripts[19].isHostPanel = true;

  // Step 2: Cover art
  onProgress?.(12, '🎨 Painting the cover in blood and shadow...', 'vault_cover');
  const coverImg = await generateImage(
    buildCoverPrompt(scriptData.title, config.premise, config.sinType),
    '3:4'
  );
  await sleep(1500);

  // Step 3: Panel illustrations
  const panelIllustrations: (string | null)[] = [];
  for (let i = 0; i < panelScripts.length; i++) {
    const pct = 20 + Math.round((i / panelScripts.length) * 65);
    onProgress?.(pct, `🖊️ Drawing panel ${i + 1} of ${panelScripts.length}...`, 'vault_panels');
    const img = await generateImage(buildPanelPrompt(panelScripts[i]), '3:4');
    panelIllustrations.push(img && img !== 'QUOTA_EXHAUSTED' ? `data:image/png;base64,${img}` : null);
    if (i < panelScripts.length - 1) await sleep(1200);
  }

  onProgress?.(88, '📖 Binding the pages of the damned...', 'vault_assemble');

  // Step 4: Assemble story
  const panels: VaultPanel[] = panelScripts.map((ps, i) => ({
    panelNumber: ps.panelNumber,
    isHostPanel: ps.isHostPanel || i === 0 || i === 19,
    artDirection: ps.artDirection,
    illustration: panelIllustrations[i],
    dialogue: ps.dialogue || [],
  }));

  // 4 pages: 5 panels each
  const pages: VaultPage[] = [
    { pageNumber: 1, panels: panels.slice(0, 5) },
    { pageNumber: 2, panels: panels.slice(5, 10) },
    { pageNumber: 3, panels: panels.slice(10, 15) },
    { pageNumber: 4, panels: panels.slice(15, 20) },
  ];

  onProgress?.(95, '⚰️ Sealing the vault...', 'vault_assemble');

  return {
    title: scriptData.title || 'An Untitled Tale',
    subtitle: scriptData.subtitle || '',
    sinType: config.sinType,
    issueNumber: scriptData.issueNumber || 1,
    coverIllustration: (coverImg && coverImg !== 'QUOTA_EXHAUSTED') ? `data:image/png;base64,${coverImg}` : undefined,
    pages,
  };
}
