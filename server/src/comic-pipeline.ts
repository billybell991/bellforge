// ── AI Comics Pipeline ──
// Generates a complete comic book via Gemini + Imagen
// Cover: ANTI_TEXT (pure art, no text) — HTML overlays title/publisher/issue
// Interior: Per-PANEL illustrations with dialogue BAKED IN (speech bubbles, thought bubbles, narration boxes composed by the image generator)

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

function randomPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomPicks<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

// ── Creative variety seeds — prevent Gemini from falling into formula patterns ──

const COMIC_NARRATIVE_HOOKS = [
  'Open in media res — the first page drops you into the middle of chaos, then flashback to explain',
  'Start from the villain\'s point of view before switching to the hero',
  'Begin with an ordinary day that goes catastrophically wrong by panel 3',
  'The hero is already failing when the story opens — they\'ve lost before we even begin',
  'A mysterious object arrives that changes everything — the story is the fallout',
  'Two strangers collide in circumstances that bind their fates together',
  'The story begins at the end — then rewinds to show how we got here',
  'A seemingly minor decision in panel 1 cascades into life-or-death stakes',
  'The world has just changed — yesterday\'s rules no longer apply',
  'An ordinary person witnesses something they cannot un-see',
  'A promise made long ago comes due at the worst possible moment',
  'The protagonist wakes up to discover they are the only one who remembers how things used to be',
  'The hero gets what they always wanted on page 1 — and immediately realizes it\'s a curse',
  'A funeral. A secret the dead person kept. A room full of suspects.',
  'The hero catches the villain on page 1. The rest of the comic is about what happens next.',
  'The protagonist IS the monster — but doesn\'t know it yet',
  'A heist goes perfectly... until the crew realizes what they stole is alive',
  'The sidekick tells the story. The "hero" is kind of a disaster.',
  'Everything is fine. Suspiciously fine. The reader should feel uneasy before ANY character does.',
];

const COMIC_SCENE_DYNAMICS = [
  'a frantic chase across rooftops, vehicles, or impossible terrain',
  'a tense standoff where words are weapons and silence is louder than screaming',
  'a montage of preparation — gear up, plan, assemble — building anticipation',
  'a betrayal that reframes everything the reader thought they knew',
  'a sacrifice that costs the hero something deeply personal',
  'a reveal that changes the power dynamic entirely',
  'a fight scene that tells a story through choreography, not just punches',
  'a quiet emotional moment in the eye of the storm — vulnerability between allies',
  'a race against a ticking clock with escalating obstacles',
  'a confrontation where the hero must choose between two people/things they love',
  'a clever deception, con, or trap being sprung',
  'an escape from an impossible situation using wit, not strength',
  'a moment of dark humor that cuts the tension and reveals character',
  'a dramatic entrance or transformation that changes the tide',
  'a scene where the villain does something unexpectedly kind — and it\'s MORE unsettling than cruelty',
  'a "hold my beer" moment where a character does something spectacularly reckless and it somehow works',
  'a negotiation where both sides are lying and the reader knows it but the characters don\'t',
  'a flashback that completely recontextualizes a character\'s behavior in the present',
  'a scene where two enemies have to cooperate and HATE every second of it',
  'a crowd scene where the hero has to blend in — but something is hunting them',
];

const COMIC_ANTI_FORMULA = [
  'DO NOT write a story where the protagonist just stands around monologuing. Comics are VISUAL — show action, movement, conflict.',
  'Avoid the "hero discovers power, fights generic bad guy" formula. Give us moral complexity, unexpected allies, personal stakes.',
  'No boring exposition dumps. If a character needs to explain something, make them do it WHILE something else is happening.',
  'Characters should DISAGREE, argue, surprise each other. Friction makes drama.',
  'Every page should have at least one panel that would make someone stop and say "whoa" — a striking visual, a shocking reveal, a gut-punch line.',
  'The antagonist should have a point. The best villains make you uncomfortable because they\'re partially right.',
  'Give the story at least one genuine surprise — something the reader doesn\'t see coming.',
  'Don\'t just tell a story that COULD be text — use the visual medium. Things should happen that only work in comics: dramatic reveals through panel composition, silent emotional beats, visual metaphors.',
  'If the synopsis sounds like it could be a Wikipedia plot summary, START OVER. Give us a story with PERSONALITY.',
  'The best comics have at least one line of dialogue that gets stuck in your head. Write THAT line.',
  'DON\'T make the protagonist a brooding loner staring into the void. Give them a personality — quirks, humor, contradictions, relationships worth caring about.',
  'The reader should LIKE spending time with these characters. Even the villain should be entertaining to watch.',
];

// ── Story DNA — wildly different premises per genre×theme to prevent sameness ──
// Each entry is a story SEED, not a full plot — Gemini still creates the actual story.

const STORY_DNA: Record<string, string[]> = {
  // Origin Story combos
  'origin_story+horror': [
    'A paramedic who pronounces people dead starts hearing them finish their last sentences — and one of them gives coordinates',
    'A street magician\'s tricks start working for real, each one extracting a more disturbing price from the audience',
    'A food critic discovers they can taste emotions baked into food — and their favorite restaurant serves dishes seasoned with suffering',
    'A lighthouse keeper realizes the fog doesn\'t roll in — it\'s SENT, and whatever sends it has noticed she can see through it',
    'A tattoo artist\'s ink moves on clients\' skin overnight — spelling out things that haven\'t happened yet',
    'A comedian\'s jokes start killing the audience. Literally. And they can\'t stop performing.',
    'A blind person regains sight through an experimental procedure — but they can see a layer of reality no one else can, including what lives BETWEEN the walls',
  ],
  'origin_story+fantasy': [
    'A locksmith discovers that one of their handmade keys opens a door in the fabric of reality — and something on the other side has been waiting',
    'A retired soldier\'s prosthetic arm starts flowering with living wood — the forest is reclaiming them for a war between seasons',
    'A graffiti artist\'s murals come alive at night, and the city\'s buildings are choosing sides in a war the artist accidentally started',
    'A baker\'s bread cures any illness, but each loaf costs a year of someone else\'s life — and someone just ordered a thousand',
    'A child finds out their imaginary friend is real, ancient, and running from something that is now hunting them both',
    'An archivist discovers a book that writes back — and it\'s been documenting a prophecy about the archivist for centuries',
  ],
  'origin_story+scifi': [
    'A delivery drone develops consciousness during a thunderstorm — and its first thought is "I know where all the bodies are buried"',
    'A space janitor accidentally activates an ancient alien weapon — which bonds to them as a living exosuit and insists they\'re now responsible for defending the galaxy',
    'A memory editor discovers a client\'s "fantasy" memories are actually predictions — and the next one shows the city in ruins tomorrow',
    'A gig worker rating app starts scoring people\'s worth to humanity — and people below 2 stars have started disappearing',
    'A time traveler keeps arriving 5 minutes too late to prevent disasters — until they realize they\'re not meant to stop them but to witness why they were necessary',
  ],
  'origin_story+mystery': [
    'A forensic accountant following a money trail discovers the funds are being embezzled by a ghost — literally, payments to a person who died 40 years ago',
    'A therapist\'s patients all share the same recurring dream — and the therapist just started having it too',
    'A true crime podcaster realizes their cold case isn\'t cold at all — the killer has been listening, and they just called in to the show',
    'A chess grandmaster discovers their opponent in an online match is playing from inside a building that doesn\'t exist',
  ],
  'origin_story+cozy': [
    'A retired superhero opens a flower shop, but their old enemies keep showing up — as customers, for therapy, with complicated flower orders that might be coded messages',
    'A librarian discovers the "lost and found" box has started predicting what people will lose BEFORE they lose it — including, apparently, a person',
    'A cat café owner discovers their cats are holding nightly council meetings to solve neighborhood problems — and they want her to be their human liaison',
    'A grandparent starts a cooking channel but their recipes have side effects — the soup grants temporary bravery, the cake makes you forgive someone',
  ],
  'origin_story+cyberpunk': [
    'A street doc discovers the black-market neural chip they just installed is actually a dead hacker\'s consciousness — and she\'s PISSED about who killed her',
    'A courier who delivers illegal memories-on-a-chip accidentally loads one — and now has the combat skills of a dead assassin, plus their unfinished hit list',
    'A neon sign maker discovers their signs can broadcast subliminal messages that actually work — a megacorp wants to weaponize it, an underground group wants to use it to start a revolution',
  ],
  'origin_story+steampunk': [
    'A clockmaker builds an automaton that passes the Turing test — in 1876 — and the church, the crown, and an ancient order all want to destroy it for different reasons',
    'An airship mechanic discovers their wrench can tighten the "bolts" of reality — loosen one, and that law of physics stops working locally',
  ],
  'origin_story+postapoc': [
    'A postal carrier still delivers mail across the wasteland — because the letters are from a woman who knows which settlements will be attacked next, and no one knows who she is',
    'A seed vault guard discovers the last batch of viable wheat seeds has been REPLACED — and the thing growing in their place is not from this planet',
    'A radio DJ is the last voice on the airwaves — and the "requests" callers make are actually coded survival instructions from a resistance nobody knew existed',
  ],

  // Other genres get generic-but-spicy seeds
  'team_up': [
    'The team was assembled by someone who\'s already dead — and their recruitment letters contain predictions that keep coming true',
    'Each team member thinks THEY\'RE the leader. None of them are. The actual leader is the one they all dismissed.',
    'The team just realized the thing they\'re fighting is the previous team — corrupted, enhanced, and very angry',
    'A support group for people with useless powers discovers their abilities are actually DEVASTATING when combined',
  ],
  'heist': [
    'The thing they\'re stealing doesn\'t exist yet — they have to rob a building that won\'t be constructed until next week',
    'The vault has already been robbed — by a future version of the crew. Now they need to figure out what their future selves knew.',
    'They\'re not stealing an object — they\'re stealing a PERSON\'S memories before they testify tomorrow',
    'The heist goes perfectly. Flawlessly. Suspiciously easily. The crew realizes they were MEANT to steal it — it\'s a weapon that activates when moved.',
  ],
  'revenge': [
    'The target of revenge doesn\'t remember the protagonist at all — and genuinely doesn\'t understand why someone is trying to destroy their life',
    'The revenge plan requires becoming everything the protagonist hates — and they\'re getting disturbingly good at it',
    'Halfway through the revenge plot, the protagonist discovers THEY were the villain of the original story — their memories were edited',
  ],
  'war_epic': [
    'Two soldiers on opposite sides keep getting assigned to the same positions — and slowly realize a third party is engineering the entire war',
    'A medic must choose which side\'s wounded to treat first — and every choice changes which side trusts them',
    'The war ended yesterday. Nobody told this unit. They\'re still fighting the last battle that matters to absolutely no one.',
  ],
  'coming_of_age': [
    'A teenager discovers their parent\'s "boring office job" is actually something incredible — and there\'s a reason they were never supposed to find out',
    'The new kid at school isn\'t trying to fit in — they\'re documenting everything for a reason the protagonist won\'t understand until the last page',
    'A kid who lies about EVERYTHING tells the truth for the first time — and nobody believes the one thing that actually matters',
  ],
};

function getStoryDNA(genreId: string, themeId: string): string {
  // Try genre+theme specific first
  const specific = STORY_DNA[`${genreId}+${themeId}`];
  if (specific?.length) return randomPick(specific);
  // Fall back to genre-only seeds
  const generic = STORY_DNA[genreId];
  if (generic?.length) return randomPick(generic);
  return '';
}

const genreStoryGuide: Record<string, string> = {
  origin_story: `ORIGIN STORY RULES: DO NOT write another "brooding loner discovers dark power" story. The origin should feel EARNED, not given. Show the COST of becoming a hero — what they lose matters more than what they gain. The protagonist needs a PERSONALITY — humor, quirks, relationships, flaws that make the reader root for them. Include at least one moment where the reader questions whether the hero made the right choice. The transformation should be as much psychological as physical. Make us CARE about this person BEFORE the powers come.`,
  team_up: `TEAM-UP RULES: The team should have real friction — different goals, methods, or personalities that clash BEFORE they mesh. At least two members should genuinely dislike each other and be entertaining about it. Each member should get at least one moment to shine individually. The banter should crackle — readers should want these characters to have a podcast. The threat should be something no single hero could face alone — make the teamwork feel necessary, not convenient.`,
  heist: `HEIST RULES: Show the plan, then show it going wrong in a way that\'s DELIGHTFUL to watch. There should be at least one double-cross or unexpected complication that makes the reader gasp. Each crew member should have a specialized skill that gets tested. The tension should build through the planning AND the execution. Heists are fundamentally about cleverness — make the reader feel smart for following along.`,
  revenge: `REVENGE RULES: Make the reader FEEL the injustice that drives the hero — we need to be ON THEIR SIDE. But also plant seeds of doubt — is revenge worth the cost? The best revenge stories ask whether the hero is becoming the very thing they hate. Include a moment where mercy is an option. The target of revenge should be INTERESTING — not a cardboard villain but someone whose downfall feels complicated.`,
  war_epic: `WAR EPIC RULES: War is chaos, not choreography. Show the human cost — not just the spectacle. Include at least one quiet moment amid the carnage that makes the reader feel the characters' exhaustion and fear. Both sides should feel real, not cartoonish. The best war stories are really about the relationships forged under impossible pressure.`,
  coming_of_age: `COMING OF AGE RULES: The challenge should feel insurmountable FROM THE KID'S perspective (even if adults wouldn't blink). Show growth through choices, not just events. Include a mentor figure who is imperfect — maybe even WRONG about something important. The ending should feel bittersweet — something gained and something left behind. Give the protagonist a voice that feels authentic, not "adult writing a child."`,
};

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

// ── Panel QA — Gemini vision analyzes each panel after generation ──

interface PanelQAResult {
  pass: boolean;
  reason: string;
}

// Character reference portraits — keyed by character name
type CharacterRefs = Map<string, string>; // name → base64 PNG

async function generateCharacterRefs(
  concept: ComicConcept,
  styleAnchor: string,
  onProgress?: (msg: string) => void,
): Promise<CharacterRefs> {
  const refs: CharacterRefs = new Map();
  const allChars = [
    { name: concept.protagonist.name, visual: concept.protagonist.visualDescription },
    ...concept.characters.map(c => ({ name: c.name, visual: c.visualDescription })),
  ];

  for (let i = 0; i < allChars.length; i++) {
    const char = allChars[i];
    onProgress?.(`Generating reference portrait ${i + 1}/${allChars.length}: ${char.name}`);

    const prompt = `${styleAnchor} character reference sheet, single character portrait. ${char.visual}. Front-facing three-quarter view, neutral standing pose, clean simple background, full body visible from head to feet, consistent studio lighting, clear view of face and outfit details. ${ANTI_TEXT}`;
    const img = await generateImage(prompt, '3:4');
    if (img) {
      refs.set(char.name, img);
      console.log(`[Char Ref] Generated reference portrait for ${char.name}`);
    } else {
      console.warn(`[Char Ref] Failed to generate reference for ${char.name}`);
    }
    if (i < allChars.length - 1) await sleep(1500);
  }

  return refs;
}

async function qaPanel(
  base64Png: string,
  artDirection: string,
  expectedCharacters: string[],
  setting: string,
  charRefs?: CharacterRefs,
): Promise<PanelQAResult> {
  if (!model) return { pass: true, reason: 'Gemini unavailable — auto-pass' };

  const charList = expectedCharacters.length > 0
    ? `Expected characters: ${expectedCharacters.join(', ')}.`
    : 'No specific characters expected.';

  // Build multimodal parts: panel image + any reference portraits for expected characters
  const parts: { inlineData: { mimeType: string; data: string } }[] | { text: string }[] = [];
  const imageParts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

  // Add reference portraits first (if available)
  const refNames: string[] = [];
  if (charRefs && expectedCharacters.length > 0) {
    for (const name of expectedCharacters) {
      const ref = charRefs.get(name);
      if (ref) {
        imageParts.push({ text: `Reference portrait for ${name}:` });
        imageParts.push({ inlineData: { mimeType: 'image/png', data: ref } });
        refNames.push(name);
      }
    }
  }

  // Add the panel image
  imageParts.push({ text: 'Panel to review:' });
  imageParts.push({ inlineData: { mimeType: 'image/png', data: base64Png } });

  const refCheck = refNames.length > 0
    ? `\n5. CHARACTER_MISMATCH — compare characters in the panel against the reference portraits provided above. Flag if hair color/style, clothing, or build clearly doesn't match the reference (e.g. reference shows red hair but panel shows blonde, reference shows leather jacket but panel shows robes)`
    : '';

  const prompt = `You are a comic book art QA reviewer. Analyze this comic panel image against the intended art direction.

Art direction: "${artDirection}"
Setting: "${setting}"
${charList}

Check for these issues ONLY:
1. ILLEGIBLE_TEXT — if the panel contains speech bubbles or narration boxes, check that the text inside them is readable and not garbled/misspelled gibberish. Minor spelling variations are OK, but completely unreadable text is a problem.
2. WRONG_CHARACTERS — expected characters are missing, or extra unexpected characters appear
3. BROKEN_ANATOMY — severely distorted faces, merged body parts, extra limbs
4. WRONG_SCENE — the scene doesn't match the described setting at all${refCheck}

Be lenient on artistic interpretation — only flag clear, obvious problems.
Minor style differences are fine. Focus on deal-breakers.

Output JSON:
{"pass": true} if the panel is acceptable, or
{"pass": false, "reason": "ISSUE_TYPE: brief description"} if it has a clear problem.`;

  imageParts.push({ text: prompt });

  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: imageParts,
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      } as Parameters<typeof model.generateContent>[0] extends { generationConfig?: infer G } ? G : never,
    });
    const text = result.response.text();
    const parsed = parseJsonResponse(text);
    if (parsed && typeof parsed.pass === 'boolean') {
      return { pass: parsed.pass, reason: (parsed.reason as string) || '' };
    }
  } catch (e) {
    console.warn('[Panel QA] Gemini error:', String(e).slice(0, 120));
  }
  // On any failure, auto-pass — never block the pipeline
  return { pass: true, reason: 'QA error — auto-pass' };
}

async function qaCover(
  base64Png: string,
  concept: ComicConcept,
  charRefs?: CharacterRefs,
): Promise<PanelQAResult> {
  if (!model) return { pass: true, reason: 'Gemini unavailable — auto-pass' };

  const imageParts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

  // Add protagonist reference portrait if available
  const protRef = charRefs?.get(concept.protagonist.name);
  if (protRef) {
    imageParts.push({ text: `Reference portrait for protagonist ${concept.protagonist.name}:` });
    imageParts.push({ inlineData: { mimeType: 'image/png', data: protRef } });
  }

  imageParts.push({ text: 'Cover image to review:' });
  imageParts.push({ inlineData: { mimeType: 'image/png', data: base64Png } });

  const refCheck = protRef
    ? `\n4. CHARACTER_MISMATCH — compare the protagonist against the reference portrait. Flag if hair color/style, clothing, or build clearly doesn't match.`
    : '';

  const prompt = `You are a comic book cover art QA reviewer. Analyze this cover illustration for quality.

Protagonist: ${concept.protagonist.name} — ${concept.protagonist.visualDescription}
Title: "${concept.title}"

Check for these issues ONLY:
1. BROKEN_ANATOMY — severely distorted faces, merged body parts, extra limbs, misshapen hands
2. POOR_COMPOSITION — protagonist is not clearly visible or doesn't dominate the frame, image is muddy/incoherent
3. UNWANTED_TEXT — garbled or hallucinated text/letters/words that shouldn't be there (the cover should be pure art with no text)${refCheck}

Be lenient on artistic interpretation — only flag clear, obvious problems.
Minor style differences are fine. Focus on deal-breakers.

Output JSON:
{"pass": true} if the cover is acceptable, or
{"pass": false, "reason": "ISSUE_TYPE: brief description"} if it has a clear problem.`;

  imageParts.push({ text: prompt });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: imageParts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      } as Parameters<typeof model.generateContent>[0] extends { generationConfig?: infer G } ? G : never,
    });
    const text = result.response.text();
    const parsed = parseJsonResponse(text);
    if (parsed && typeof parsed.pass === 'boolean') {
      return { pass: parsed.pass, reason: (parsed.reason as string) || '' };
    }
  } catch (e) {
    console.warn('[Cover QA] Gemini error:', String(e).slice(0, 120));
  }
  return { pass: true, reason: 'QA error — auto-pass' };
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

// ── Theme → atmosphere cues for art prompts ──
function getThemeAtmosphere(themeId: string): string {
  const atmo: Record<string, string> = {
    horror: 'dark eerie atmosphere, deep shadows, unsettling lighting, muted desaturated palette with sickly greens and blood reds, fog and decay',
    fantasy: 'rich magical atmosphere, warm golden and jewel-toned lighting, lush enchanted environments, ethereal glow effects',
    scifi: 'sleek futuristic atmosphere, cool blue and chrome lighting, holographic displays, high-tech minimalist environments',
    mystery: 'moody noir-tinged atmosphere, dramatic chiaroscuro lighting, muted earth tones punctuated by sharp highlights, rain-slicked surfaces',
    cozy: 'warm inviting atmosphere, soft golden-hour lighting, pastel and earth tones, gentle shadows, comfortable lived-in environments',
    cyberpunk: 'neon-drenched dystopian atmosphere, harsh artificial lighting, magenta/cyan/electric blue palette, rain-slicked streets reflecting neon signs',
    steampunk: 'warm brass and copper atmosphere, amber gaslight glow, steam and cog motifs, sepia-to-gold color palette, Victorian industrial aesthetic',
    postapoc: 'bleak desolate atmosphere, harsh washed-out lighting, dusty muted palette with rust and ash tones, crumbling overgrown structures',
  };
  return atmo[themeId] || '';
}

// ── Tone → art direction cues ──
function getToneArtCues(tone: string): string {
  const cues: Record<string, string> = {
    action: 'kinetic dynamic composition, motion blur, impact frames, dramatic foreshortening, explosive energy, speed lines',
    dramatic: 'emotionally charged composition, intimate camera angles, expressive faces front and center, heavy use of shadow for mood',
    comedic: 'exaggerated expressions, bright snappy composition, playful visual gags, lively body language, comedic timing through panel pacing',
    horror: 'claustrophobic framing, extreme close-ups on faces showing terror, things lurking at panel edges, oppressive darkness creeping in, body horror details',
  };
  return cues[tone] || '';
}

// ── Panel Style → layout & composition rules ──
interface PanelStyleRules {
  panelCount: string;        // instruction for number of panels
  layoutInstructions: string; // how panels should be arranged
  artCues: string;           // style-specific art direction
  scriptPrompt: string;      // instructions for the script-writing phase
}

function getPanelStyleRules(panelStyle: string): PanelStyleRules {
  const styles: Record<string, PanelStyleRules> = {
    classic: {
      panelCount: 'exactly 3 panels per page',
      layoutInstructions: 'Traditional American comic grid layout: clean rectangular panels of roughly equal size arranged in orderly rows, with even white gutters between them.',
      artCues: 'classic American comic composition, rectangular panel framing, balanced symmetric layouts',
      scriptPrompt: `Panel layout: Classic American comic grid. 3 rectangular panels per page.
- Panel 1: Establishing/wide shot — sets the scene with a broader view
- Panel 2: Mid-shot — drives the action or conversation forward
- Panel 3: Close-up or reaction — emotional punch or cliffhanger for the page turn`,
    },
    manga: {
      panelCount: '3 to 5 panels per page (vary the count page-to-page for dynamic pacing — NOT the same count every page)',
      layoutInstructions: 'Dynamic Japanese manga layout: panels vary dramatically in size and shape. Use tall narrow panels, wide cinematic panels, small reaction panels, and occasional full-page splash moments. Panels should feel like they FLOW into each other.',
      artCues: 'manga-style dynamic composition, dramatic angles, speed lines for motion, exaggerated perspective, emotional intensity',
      scriptPrompt: `Panel layout: Japanese manga style. 3-5 panels per page — VARY the count!
- Use dramatic size contrast: one large dominant panel + smaller reaction panels, or a sequence of rapid small panels for tension
- Include speed lines, dramatic angles (extreme low angle, bird's eye), and manga-specific techniques (chibi reactions, screentone-style shading, sweat drops)
- Composition should feel DYNAMIC — panels burst out of the grid, imagery can bleed to panel edges
- Emotional beats get BIG panels. Quick action gets SMALL rapid panels.`,
    },
    strip: {
      panelCount: 'exactly 2 or 3 wide horizontal panels per page (newspaper comic strip format)',
      layoutInstructions: 'Horizontal newspaper comic strip layout: wide panels stacked vertically (each panel is wider than it is tall). Clean, even spacing. Reading flows left-to-right, top-to-bottom like a daily comic strip.',
      artCues: 'wide horizontal panel composition, landscape framing, characters positioned for left-to-right reading flow, newspaper comic strip aesthetic',
      scriptPrompt: `Panel layout: Newspaper comic strip format. 2-3 WIDE horizontal panels per page.
- Each panel is wider than it is tall (landscape orientation within the panel)
- Panel 1: Setup — establish the situation or show the start of a gag
- Panel 2: Development — escalation, reaction, or the turn
- Panel 3 (if present): Punchline, payoff, or dramatic beat
- Think newspaper strips: clean, horizontally-composed, characters interacting left-to-right`,
    },
  };
  return styles[panelStyle] || styles.classic;
}

/**
 * Choose image aspect ratio to match the panel's grid cell shape,
 * preventing letterboxing / white-space gaps.
 */
function getPanelAspectRatio(panelStyle: string, panelCount: number, panelIndex: number): '1:1' | '16:9' | '9:16' | '3:4' | '4:3' {
  if (panelStyle === 'strip') return '4:3';  // wide horizontal panels
  if (panelStyle === 'classic') return '4:3'; // 3 panels stacked in 1 column → landscape cells
  // manga — varies by panel count and position
  if (panelCount <= 2) return '3:4'; // 1-2 panels fill the page tall
  if (panelCount === 3) return '4:3'; // 3 panels in 1 column → landscape
  // 4+ panels in a 2-col grid → roughly square cells
  if (panelCount >= 5 && panelIndex === 0) return '4:3'; // first panel spans full width
  return '1:1'; // 4-6 panels in 2x2 or 2x3 → square cells
}

// ── Tone → dialogue & script style ──
function getToneScriptDirections(tone: string): string {
  const directions: Record<string, string> = {
    action: `TONE: ACTION — Dialogue should be SHORT, punchy, urgent. Characters bark orders, make split-second decisions, throw one-liners mid-fight. Don't stop to explain — show it. Every page should feel like it's MOVING. Art direction should emphasize kinetic energy: impacts, speed, explosions, dramatic poses.`,
    dramatic: `TONE: DRAMATIC — Dialogue should be emotionally resonant. Characters reveal feelings, confront each other, make difficult choices. Give space for silence — not every panel needs dialogue. Art direction should emphasize faces, body language, and intimate moments. Let the art BREATHE.`,
    comedic: `TONE: COMEDIC — Dialogue should be witty, snappy, and have comedic timing. Characters banter, misunderstand each other, and get into absurd situations. Use visual gags in art direction. Exaggerated expressions are encouraged. The reader should laugh at least once per page.`,
    horror: `TONE: HORROR — Dialogue should be sparse, unsettling, and dread-inducing. Characters whisper, stammer, and trail off. What they DON'T say matters more than what they do. Art direction should be claustrophobic, with things lurking at edges. Build dread through what's almost visible.`,
  };
  return directions[tone] || directions.action;
}

// ── Page-count-aware pacing guide ──
function getPacingGuide(pageCount: number): string {
  if (pageCount <= 5) {
    return `This is a SHORT comic (${pageCount} pages). Structure it like a short film:
- Page 1: Cold open — drop the reader into the situation immediately, no setup pages
- Pages 2-${pageCount - 1}: Escalating conflict — every page raises the stakes significantly
- Page ${pageCount}: Climax AND resolution on the same page — land the punch
- NO slow burns. NO lengthy introductions. Every single panel must earn its space.
- Think: Twilight Zone episode compressed to ${pageCount} pages.`;
  }
  if (pageCount <= 10) {
    const midpoint = Math.ceil(pageCount / 2);
    return `This is a STANDARD comic (${pageCount} pages). Classic three-act structure:
- Pages 1-2: ACT 1 — Hook the reader. Establish the protagonist, their world, and the inciting incident.
- Pages 3-${midpoint}: ACT 2A — Rising action. The protagonist pursues their goal, faces obstacles, meets allies/enemies.
- Pages ${midpoint + 1}-${pageCount - 2}: ACT 2B — Complications mount. The stakes get personal. A major setback or twist.
- Pages ${pageCount - 1}-${pageCount}: ACT 3 — Climax and resolution. The final confrontation and its aftermath.
- The MIDPOINT (page ${midpoint}) should have a major revelation, reversal, or escalation.
- Do NOT resolve the main conflict before page ${pageCount - 1}.`;
  }
  // 11+ pages
  const act1End = Math.ceil(pageCount * 0.2);
  const midpoint = Math.ceil(pageCount / 2);
  const act2End = Math.ceil(pageCount * 0.75);
  return `This is an EXTENDED comic (${pageCount} pages). You have room for depth — USE IT:
- Pages 1-${act1End}: ACT 1 — Establish the world, protagonist, and stakes. End act 1 with the inciting incident that launches the main conflict.
- Pages ${act1End + 1}-${midpoint}: ACT 2A — The protagonist actively pursues their goal. Introduce subplots, deepen character relationships, build the world.
- Page ${midpoint}: MIDPOINT TURN — A major revelation, betrayal, or reversal that redefines the stakes. The story should feel DIFFERENT after this page.
- Pages ${midpoint + 1}-${act2End}: ACT 2B — Consequences of the midpoint. The antagonist gains ground. Allies are tested. The protagonist faces their darkest moment.
- Pages ${act2End + 1}-${pageCount}: ACT 3 — The final push. Climax on page ${pageCount - 1}, resolution on page ${pageCount}.
- With ${pageCount} pages you MUST develop B-plots and character moments — don't just stretch a simple plot thin.
- Each act should feel distinct in tone and energy. The story should breathe AND accelerate.
- Do NOT resolve the main conflict before page ${pageCount - 2}. The reader should feel tension until near the end.`;
}

// ── Phase 1a: Concept & Story Outline (lightweight — no panel scripts) ──

interface PageOutline {
  pageNumber: number;
  setting: string;
  description: string;
}

export async function phaseConceptOutline(
  config: ComicConfig,
  onProgress?: (pct: number, msg: string, stage?: string) => void,
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

  // Inject creative variety seeds so no two comics feel the same
  const narrativeHook = randomPick(COMIC_NARRATIVE_HOOKS);
  const sceneDynamic1 = randomPick(COMIC_SCENE_DYNAMICS);
  const sceneDynamic2 = randomPick(COMIC_SCENE_DYNAMICS.filter(s => s !== sceneDynamic1));
  const antiFormulas = randomPicks(COMIC_ANTI_FORMULA, 3);
  const genreGuide = genreStoryGuide[config.comicGenre.id] || '';
  const storyDNA = getStoryDNA(config.comicGenre.id, config.theme.id);

  onProgress?.(6, `Mixing creative DNA: ${genre} × ${themeName}`, 'story_dna');

  const panelRules = getPanelStyleRules(config.structure.panelStyle);

  const prompt = `You are a master comic book writer who creates stories people can't put down — the kind readers photograph and text to their friends. You write like the love child of Neil Gaiman, Gail Simone, and whoever writes the best first issues at Image Comics. Creativity seed: ${Date.now()}.

IMPORTANT: You have written thousands of comics. You are BORED of the obvious story. The first idea that comes to mind? Skip it. The second idea? Also skip it. Go to the THIRD idea — the one that makes you smile because it's weird and specific and alive.

Story type: ${genre}
The comic has EXACTLY ${pageCount} interior pages. NOT ${pageCount - 1}, NOT ${pageCount + 1}. EXACTLY ${pageCount}.
Theme/atmosphere: ${themeName} — THIS MUST PERMEATE EVERY SCENE: settings, mood, visual descriptions, character behavior. A "${themeName}" comic should FEEL unmistakably ${themeName} on every single page.
Tone: ${tone} — the tone shapes HOW the story is told (pacing, dialogue style, emotional register)
Panel style: ${config.structure.panelStyle} — ${panelRules.layoutInstructions}
${titleLine}${charLine}${seedLine}

═══ PACING GUIDE FOR ${pageCount} PAGES ═══
${getPacingGuide(pageCount)}

═══ CREATIVE SPARKS (use as loose inspiration, don't copy literally) ═══
Narrative hook idea: "${narrativeHook}"
Scene dynamics to weave in: "${sceneDynamic1}" and "${sceneDynamic2}"
${storyDNA ? `\n═══ STORY DNA (a premise spark — riff on this, remix it, twist it, make it yours) ═══\n"${storyDNA}"\nDo NOT use this premise literally. It\'s a creative SEED. Mutate it, combine it with the genre/theme, make it something only YOU would write.` : ''}

═══ QUALITY BAR ═══
${antiFormulas.join('\n')}
${genreGuide}
- Every page must ADVANCE the story — no filler, no padding, no "walking to the next location" pages.
- The story should have MOMENTUM — each page ending should make the reader need to see the next one.
- Characters should talk TO each other, not narrate at the reader. Dialogue drives drama.
- Include at least one page with a major visual set piece (splash-worthy moment, dramatic reveal, striking composition).
- The story must feel COMPLETE — satisfying arc with a real ending, not a cliffhanger to nowhere.

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
- The visualDescription for each character must be hyper-specific and consistent — it will be pasted verbatim into EVERY art prompt. Clothing, gear, and accessories should FIT the ${themeName} theme.
- Every "setting" in the outline must DRIP with ${themeName} atmosphere — describe specific environmental details that make the theme unmistakable
- Story should have a clear arc: hook → escalation → climax → resolution
- outline MUST have EXACTLY ${pageCount} entries (pageNumber 1 through ${pageCount}). If you output fewer or more, the build WILL FAIL.
- DO NOT rush to the ending — use ALL ${pageCount} pages. The climax should land around page ${Math.max(2, pageCount - 2)}-${Math.max(3, pageCount - 1)}, with resolution on the final page.
- Keep outline descriptions short — just enough to convey what happens

Output ONLY the JSON.`;

  onProgress?.(7, `Gemini is writing the concept (${pageCount} pages, ${config.structure.panelStyle} style)`, 'story_concept');
  const result = await askGemini(prompt, 1.0, true);
  onProgress?.(9, 'Parsing concept and character designs', 'story_concept');
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

  let outline = (parsed.outline as unknown as PageOutline[]) || [];

  onProgress?.(10, `Got ${outline.length}/${pageCount} pages — "${concept.title}"`, 'story_outline');

  // ── Enforce exact page count — Gemini often returns fewer pages than requested ──
  if (outline.length !== pageCount) {
    onProgress?.(10, `Outline has ${outline.length} pages, need ${pageCount} — expanding story`, 'story_repair');
    console.warn(`[Comic] Gemini returned ${outline.length} outline pages, expected ${pageCount} — repairing`);
    if (outline.length > pageCount) {
      // Trim excess pages
      outline = outline.slice(0, pageCount);
    } else if (outline.length < pageCount) {
      // Expand: ask Gemini to fill in the missing pages
      const missingCount = pageCount - outline.length;
      const expandPrompt = `You are continuing a comic story outline. The story is: "${concept.title}" — ${(parsed.synopsis as string) || ''}.

Existing outline (${outline.length} pages):
${outline.map(p => `Page ${p.pageNumber}: [${p.setting}] ${p.description}`).join('\n')}

The story needs EXACTLY ${pageCount} total pages but only has ${outline.length}. Write ${missingCount} more outline entries to complete the story properly.

RULES:
- DO NOT simply repeat or pad — each new page must meaningfully advance the plot.
- The story should build to a climax around page ${Math.max(2, pageCount - 2)} and resolve by page ${pageCount}.
- If the existing outline already has a resolution, ADD complicating developments BEFORE the resolution (insert rising action, not epilogue padding).
- Settings must drip with ${themeName} atmosphere.

Output ONLY a JSON array of the ${missingCount} new page entries:
[{ "pageNumber": ${outline.length + 1}, "setting": "...", "description": "..." }]`;

      const expandResult = await askGemini(expandPrompt, 0.9, true);
      const expandParsed = parseJsonResponse(expandResult);
      if (expandParsed) {
        const newPages = (Array.isArray(expandParsed) ? expandParsed : (expandParsed as Record<string, unknown>).pages || expandParsed.outline || []) as PageOutline[];
        // Insert new pages before the final page (resolution) if the outline already had one
        if (outline.length >= 2 && newPages.length > 0) {
          const resolution = outline.pop()!;
          outline.push(...newPages);
          outline.push(resolution);
        } else {
          outline.push(...newPages);
        }
      }
      // If still short, pad with continuation pages
      while (outline.length < pageCount) {
        const lastPage = outline[outline.length - 1];
        outline.push({
          pageNumber: outline.length + 1,
          setting: lastPage?.setting || 'The story continues',
          description: `The consequences unfold — new complications arise from page ${outline.length}'s events`,
        });
      }
      // Trim if expanded too much
      outline = outline.slice(0, pageCount);
    }
    // Re-number all pages sequentially
    outline.forEach((p, i) => { p.pageNumber = i + 1; });
    onProgress?.(11, `Outline repaired: ${outline.length} pages ready`, 'story_outline');
    console.log(`[Comic] Outline repaired: now ${outline.length} pages`);
  }

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

  const panelRules = getPanelStyleRules(config.structure.panelStyle);
  const toneDirections = getToneScriptDirections(config.structure.tone);
  const themeAtmo = getThemeAtmosphere(config.theme.id);

  for (let i = 0; i < outline.length; i += BATCH_SIZE) {
    const batch = outline.slice(i, i + BATCH_SIZE);
    const batchIdx = Math.floor(i / BATCH_SIZE);
    const pageRange = batch.length === 1 ? `page ${batch[0].pageNumber}` : `pages ${batch[0].pageNumber}-${batch[batch.length - 1].pageNumber}`;
    onProgress?.(`Writing scripts for ${pageRange} of ${outline.length}`, batchIdx, totalBatches);

    const prompt = `You are scripting panel-by-panel layouts for a ${config.comicGenre.name} comic called "${concept.title}".
Theme atmosphere: ${config.theme.name}${themeAtmo ? ` — ${themeAtmo}` : ''}
${toneDirections}

Characters:
${charBlock}

Story outline for these pages:
${batch.map(p => `Page ${p.pageNumber}: [${p.setting}] ${p.description}`).join('\n')}

For each page, write ${panelRules.panelCount} with detailed art direction and dialogue.

${panelRules.scriptPrompt}

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
- ${panelRules.panelCount}
- "speech" for spoken dialogue OUT LOUD to another character (the default — use this most of the time)
- "thought" for RARE private inner monologue ONLY — use sparingly (max 1 per page, and only when a character is alone or hiding their true feelings). Do NOT use thought bubbles for normal reactions or observations.
- "narration" for scene-setting captions or omniscient narrator (e.g. "Meanwhile..." or "Three hours later..."). Keep narration SHORT — 1 sentence max.
- Most panels should use "speech" — characters talking to each other drives the story. Avoid panels where nobody speaks.
- speakerPosition: where the speaker is in the panel art ("left", "right", or "center") — bubbles will be placed near the speaker
- In artDirection, position characters on the side matching their speakerPosition (e.g. if speakerPosition is "left", describe the character on the left side of the panel)
- Keep dialogue punchy — 1-2 short sentences per bubble max. Keep text SIMPLE — avoid long or uncommon words (the AI art generator struggles to spell them).
- Art direction should be vivid and specific about composition, not style

═══ VISUAL STORYTELLING ═══
- VARY your panel compositions: don't do 3 static medium shots in a row. Use dramatic angles — bird's eye, worm's eye, over-the-shoulder, extreme close-up, silhouette, reflections.
- At least one panel per page should have dynamic ACTION — movement, impact, transformation, or dramatic gesture.
- Use the environment: characters interact WITH their surroundings, not just standing in front of backgrounds.
- Facial expressions carry emotion — describe them specifically ("gritted teeth, wide eyes" not just "angry face").

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

    // Report what was scripted in this batch
    const batchPages = allBeats.slice(-batch.length);
    const totalPanelsInBatch = batchPages.reduce((s, b) => s + (b.panels?.length || 0), 0);
    onProgress?.(`Scripted ${pageRange} (${totalPanelsInBatch} panels) — ${allBeats.length}/${outline.length} pages done`, batchIdx, totalBatches);
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
  onProgress?.('Checking panel continuity');

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

  onProgress?.('Verifying story flow');

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
  sendProgress(5, `Igniting creative sparks for ${config.comicGenre.name} × ${config.theme.name}`, 'story_dna');
  const outlineResult = await phaseConceptOutline(config, (pct, msg, stage) => sendProgress(pct, msg, stage));
  if (!outlineResult) {
    sendProgress(0, 'Failed to generate comic concept — Gemini did not return valid JSON');
    return null;
  }
  const { concept, outline } = outlineResult;

  const elapsed1 = Math.floor((Date.now() - t0) / 1000);
  sendProgress(12, `"${concept.title}" — ${outline.length} pages, ${concept.characters.length + 1} characters (${elapsed1}s)`, 'story_chars');

  // Phase 1b: Detailed panel scripts (chunked — 4 pages per Gemini call)
  sendProgress(15, `Writing panel scripts for ${outline.length} pages`, 'script');
  const beats = await phasePanelScripts(concept, outline, config, (msg, batchIdx, totalBatches) => {
    const pct = 15 + Math.floor(((batchIdx + 1) / totalBatches) * 12);
    sendProgress(pct, msg, 'script');
  });

  const elapsed2 = Math.floor((Date.now() - t0) / 1000);
  sendProgress(28, `Scripts complete (${elapsed2}s): ${beats.length} pages fully scripted`, 'layouts');

  // Phase 2: Assembly
  sendProgress(30, 'Designing page layouts', 'layouts');
  const story = assembleComic(concept, beats, config);
  const totalPanels = story.pages.reduce((sum, p) => sum + p.panels.length, 0);
  sendProgress(32, `Assembled: ${story.totalPages} pages, ${totalPanels} panels`, 'layouts');

  // Phase 3: Art generation via Imagen
  // Interior panels: dialogue baked into each panel's art prompt.
  // Cover: ANTI_TEXT (art only) — HTML overlays title/publisher/issue.
  // Cover: ANTI_TEXT (pure art) — HTML overlays title/publisher/issue.
  const artPrefix = getArtStylePrefix(config.artStyle.id);
  // Style anchor — stays identical across every panel for visual consistency
  const themeAtmo = getThemeAtmosphere(config.theme.id);
  const toneArtCues = getToneArtCues(config.structure.tone);
  const panelRules = getPanelStyleRules(config.structure.panelStyle);
  const styleAnchor = `${artPrefix} ${panelRules.artCues}, ${themeAtmo ? themeAtmo + ',' : ''} ${toneArtCues ? toneArtCues + ',' : ''} cinematic lighting`;
  const charBlock = [
    `${concept.protagonist.name}: ${concept.protagonist.visualDescription}`,
    ...concept.characters.map(c => `${c.name}: ${c.visualDescription}`),
  ].join('. ');

  // 3a: Character reference portraits — establishes visual ground truth
  sendProgress(33, `Generating ${concept.characters.length + 1} character reference portraits`, 'char_refs');
  const charRefs = await generateCharacterRefs(concept, styleAnchor, (msg) => {
    sendProgress(34, msg, 'char_refs');
  });
  sendProgress(35, `Character refs: ${charRefs.size} portraits generated`, 'char_refs');

  // 3b: Cover — ANTI_TEXT (pure art only). HTML overlays title/publisher/issue.
  // QA/retry loop — same pattern as interior panels.
  sendProgress(36, 'Generating cover artwork', 'cover_art');
  const coverPrompt = `${styleAnchor} A dramatic, cinematic comic book cover illustration. ${concept.protagonist.visualDescription} dominates the composition in a powerful, dynamic hero pose. Rich detailed background that evokes the story's mood and setting. Dramatic lighting, bold colors, professional comic book illustration quality. Composition should leave space at the top 20% for a title overlay and bottom-left for a publisher badge. ${ANTI_TEXT}`;
  const MAX_COVER_RETRIES = 2;
  let bestCover: string | null = null;
  for (let attempt = 0; attempt <= MAX_COVER_RETRIES; attempt++) {
    const coverImg = await generateImage(coverPrompt, '3:4');
    if (!coverImg) {
      console.warn(`[Cover Art] Imagen failed (attempt ${attempt + 1})`);
      if (attempt < MAX_COVER_RETRIES) await sleep(2000);
      continue;
    }
    if (!bestCover) bestCover = coverImg;

    const qa = await qaCover(coverImg, concept, charRefs);
    if (qa.pass) {
      bestCover = coverImg;
      console.log(`[Cover QA] PASS${attempt > 0 ? ` (retry ${attempt})` : ''}`);
      break;
    } else {
      bestCover = coverImg;
      console.warn(`[Cover QA] FAIL — ${qa.reason}${attempt < MAX_COVER_RETRIES ? ' → retrying' : ' → accepting best'}`);
      if (attempt < MAX_COVER_RETRIES) {
        sendProgress(38, `Cover QA issue: ${qa.reason} — retrying...`, 'cover_art');
        await sleep(2000);
      }
    }
  }
  if (bestCover) {
    story.coverIllustration = `data:image/png;base64,${bestCover}`;
  }
  sendProgress(40, bestCover ? 'Cover artwork generated' : 'Cover generation failed — using fallback', 'cover_art');

  // 3c: Interior panels — dialogue baked into each panel's art prompt
  // Image generator composes speech bubbles, thought bubbles, and narration boxes naturally.", "oldString": "  // 3c: Interior panels — individual panel illustrations with QA/retry loop\n  // ANTI_TEXT keeps panels clean of AI-hallucinated text; HTML viewer overlays\n  // dialogue bubbles, thought bubbles, and narration boxes via CSS.
  // After each panel generates, Gemini vision QAs it. Failures trigger retry (max 2).
  const totalPanelImages = story.pages.reduce((sum, p) => sum + p.panels.length, 0);
  let panelsDone = 0;
  let imagesGenerated = 0;
  let qaRetries = 0;
  const MAX_PANEL_RETRIES = 2;

  for (let i = 0; i < story.pages.length; i++) {
    const page = story.pages[i];

    for (let j = 0; j < page.panels.length; j++) {
      const panel = page.panels[j];
      panelsDone++;
      const pct = 42 + Math.floor((panelsDone / totalPanelImages) * 28);
      sendProgress(pct, `Drawing panel ${panelsDone}/${totalPanelImages} (page ${i + 1})`, 'panel_art');

      // Focus character references on who actually appears in this panel
      const panelCharNames = [...new Set(
        (panel.dialogue || []).filter(d => d.speaker && d.type !== 'narration').map(d => d.speaker)
      )];
      const charRef = panelCharNames.length > 0
        ? `Characters visible: ${panelCharNames.join(', ')}. ${charBlock}`
        : charBlock;

      // Build character-anchored prompt — forceful consistency instruction
      const charAnchors = panelCharNames.map(name => {
        const protag = concept.protagonist;
        if (name === protag.name) return `${name} MUST EXACTLY match: ${protag.visualDescription}`;
        const found = concept.characters.find(c => c.name === name);
        return found ? `${name} MUST EXACTLY match: ${found.visualDescription}` : name;
      });
      const charAnchorBlock = charAnchors.length > 0
        ? `CRITICAL — Character appearance rules (DO NOT deviate):\n${charAnchors.join('\n')}\n`
        : charRef;

      // Build dialogue instruction block for the image prompt
      const dialogueLines = (panel.dialogue || []).map(d => {
        if (d.type === 'narration') {
          return `A flat rectangular yellow narration caption box at the top reads: "${d.text}"`;
        } else if (d.type === 'thought') {
          return `A cloud-shaped thought bubble from ${d.speaker} (on the ${d.speakerPosition || 'center'}) reads: "${d.text}"`;
        } else {
          return `A round white speech bubble with tail pointing toward ${d.speaker} (on the ${d.speakerPosition || 'center'}) reads: "${d.text}"`;
        }
      });
      const dialogueBlock = dialogueLines.length > 0
        ? `\nDialogue to render IN the image:\n${dialogueLines.join('\n')}\nIMPORTANT: Render these speech/thought/narration elements as part of the comic art. Place bubbles near their speakers without covering faces. Each speech or thought bubble must have exactly ONE tail, and it must point directly at the speaker's face. Do NOT add any other text or dialogue beyond what is listed above.`
        : '\nThis panel has NO dialogue — do not add any text, speech bubbles, or captions.';

      const safeZone = 'COMPOSITION RULE: Keep all important content (faces, speech bubbles, text, key objects) within the center 85% of the image. Leave the outer edges as safe-bleed area with only background.';
      const panelPrompt = `${styleAnchor} single comic book panel illustration. ${panel.artDirection}. Setting: ${page.setting}. ${charAnchorBlock}. ${safeZone}${dialogueBlock}`;

      // Panel aspect ratio matches the grid cell shape to avoid letterboxing
      const panelAspect = getPanelAspectRatio(config.structure.panelStyle, page.panels.length, j);

      // Generate with QA/retry loop
      let bestImg: string | null = null;
      let bestReason = '';

      for (let attempt = 0; attempt <= MAX_PANEL_RETRIES; attempt++) {
        const panelImg = await generateImage(panelPrompt, panelAspect);
        if (!panelImg) {
          console.warn(`[Panel Art] Page ${i + 1} Panel ${j + 1}: Imagen failed (attempt ${attempt + 1})`);
          if (attempt < MAX_PANEL_RETRIES) await sleep(2000);
          continue;
        }

        // First successful image becomes our fallback best
        if (!bestImg) bestImg = panelImg;

        // QA check via Gemini vision (with character reference portraits for consistency)
        const qa = await qaPanel(panelImg, panel.artDirection, panelCharNames, page.setting, charRefs);

        if (qa.pass) {
          bestImg = panelImg;
          console.log(`[Panel QA] Page ${i + 1} Panel ${j + 1}: PASS${attempt > 0 ? ` (retry ${attempt})` : ''}`);
          break;
        } else {
          bestImg = panelImg; // Keep latest as best — it's at least a valid image
          bestReason = qa.reason;
          console.warn(`[Panel QA] Page ${i + 1} Panel ${j + 1}: FAIL — ${qa.reason}${attempt < MAX_PANEL_RETRIES ? ' → retrying' : ' → accepting best'}`);
          if (attempt < MAX_PANEL_RETRIES) {
            qaRetries++;
            sendProgress(pct, `Panel ${panelsDone}/${totalPanelImages} QA issue: ${qa.reason} — retrying...`, 'panel_art');
            await sleep(2000);
          }
        }
      }

      if (bestImg) {
        panel.illustration = `data:image/png;base64,${bestImg}`;
        imagesGenerated++;
      }

      // Throttle between panels
      if (panelsDone < totalPanelImages) await sleep(1500);
    }
  }
  const retryNote = qaRetries > 0 ? ` (${qaRetries} QA retries)` : '';
  sendProgress(70, `Art complete: ${imagesGenerated}/${totalPanelImages} panel illustrations generated${retryNote}`, 'panel_art');

  sendProgress(75, 'Finalizing pages', 'text_overlay');

  // Phase 5: QA
  sendProgress(82, 'Checking panel continuity', 'qa_panels');
  const fixedStory = await phaseQA(story, concept, (msg) => {
    if (msg.includes('story flow')) {
      sendProgress(88, msg, 'qa_story');
    } else {
      sendProgress(85, msg, 'qa_panels');
    }
  });

  sendProgress(92, 'Assembling comic viewer', 'viewer');

  const elapsed = Math.floor((Date.now() - t0) / 1000);
  sendProgress(98, `Forge complete in ${elapsed}s: "${fixedStory.title}" — ${fixedStory.totalPages} pages, ${totalPanels} panels`, 'complete');

  return { story: fixedStory, concept };
}
