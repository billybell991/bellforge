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

function randomPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomPicks<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

// ── Creative variety seeds for CYOA stories ──

const CYOA_NARRATIVE_HOOKS = [
  'The reader starts in the MIDDLE of a crisis — no explanation, just survival. Context comes from choices.',
  'Page 1 gives the reader a choice that seems trivial — but it secretly determines the entire trajectory of the story.',
  'The adventure opens with something the reader possesses but doesn\'t understand — every path is about figuring out what it does.',
  'The story begins at the end. The reader is dying/escaping/winning. "How did I get here?" — then the branching rewinds.',
  'Someone the reader trusts gives them instructions. Following them leads one way. Ignoring them leads another. BOTH are dangerous.',
  'The reader wakes up somewhere impossible with no memory of how they got there. Their inventory tells a story their mind doesn\'t.',
  'The reader is given a mission that sounds simple. By page 3, they realize they\'ve been lied to about EVERYTHING.',
  'Two paths diverge immediately — but they keep intersecting in unexpected ways, like parallel stories that bleed into each other.',
  'The reader has a time limit baked into the story — a ticking clock mentioned on page 1 that creates urgency in every choice.',
  'The reader starts as one character. A choice on page 2 switches them to a DIFFERENT character. Both stories interleave.',
];

const CYOA_SCENE_DYNAMICS = [
  'a choice between helping someone in danger vs. staying on mission — with real consequences either way',
  'a puzzle or riddle that the READER has to think through (not just pick a door randomly)',
  'an ally who might be a traitor — choices that test whether you trust them',
  'a moment where the reader has to sacrifice an item they\'ve been carrying — painful but necessary',
  'a chase scene where each choice is a split-second decision (left corridor or right? fight or hide?)',
  'a negotiation where saying the wrong thing gets you killed but the right thing isn\'t obvious',
  'finding a hidden path that only unlocks if you made a specific earlier choice — rewarding exploration',
  'an ethical dilemma where all good outcomes require a specific item the reader may not have found',
  'a tense infiltration where the reader has to choose their approach: stealth, disguise, distraction, or force',
  'a twist where the "bad" ending is actually better than the "good" one if you read carefully',
  'meeting someone who knows the reader\'s name — but the reader has never met them',
  'a safe room that\'s TOO safe — staying too long has consequences',
];

const CYOA_ANTI_FORMULA = [
  'The reader should never feel like choices are "door A or door B" — each choice should feel MEANINGFUL with different stakes.',
  'DO NOT write a linear story with fake choices. The branches should DIVERGE significantly. Different paths = genuinely different experiences.',
  'The prose should make the reader\'s heart rate go up. Atmospheric is good. BORING is not atmospheric — it\'s just boring.',
  'Endings should feel EARNED — a good ending after smart choices feels triumphant. A bad ending should make the reader think "I should have...".',
  'The best CYOA books have moments where the reader puts the book down and thinks about what to do before choosing. Create THAT moment.',
  'Characters the reader meets should be memorable — not just quest-givers. Give them personality, humor, menace, or warmth.',
  'At least one path should have a genuine twist — something the reader doesn\'t expect that recontextualizes the whole story.',
  'Include at least one "oh no" moment — a choice that SEEMS safe but leads somewhere terrifying.',
  'Items should feel like discoveries, not checkboxes. Finding a key is boring. Finding a strange artifact that hums when you hold it near water? That\'s a story.',
  'Dead ends should still be INTERESTING to read. Even a "game over" page should be well-written and memorable.',
];

// Genre-specific guides for CYOA story quality
const cyoaGenreGuide: Record<string, string> = {
  exploration: `EXPLORATION RULES: The world should feel VAST and mysterious. Each path should reveal something about the setting that other paths don't. The joy is DISCOVERY — hidden rooms, ancient secrets, unexplored territories. Make the reader want to replay just to see what's down that other corridor. Include at least one moment of genuine wonder — something beautiful, strange, or awe-inspiring.`,
  survival: `SURVIVAL RULES: Resources MATTER. Every choice should weigh risk vs. reward. The environment is a character — weather, terrain, wildlife all have agency. Injuries and exhaustion should accumulate across choices. Include moments of desperate improvisation where the reader has to be creative with what they have. The reader should feel the cold/heat/hunger/fear.`,
  investigation: `INVESTIGATION RULES: Clues should be SPECIFIC and satisfying to piece together. Red herrings are good but shouldn't feel cheap. The reader should be able to solve the mystery themselves if they're paying attention. Every suspect should have a plausible motive. Include at least one "a-ha!" moment where a clue clicks into place. The solution should be surprising but fair.`,
  heist_escape: `HEIST/ESCAPE RULES: The plan should be elegant. Show the security/obstacles early so the reader appreciates the cleverness of getting past them. Complications should cascade — one thing goes wrong, which causes another. Include a moment where the reader has to improvise because the plan failed. The getaway should be as tense as the break-in.`,
  quest: `EPIC QUEST RULES: The quest should feel personal, not just "save the world." Give the protagonist a REASON that matters specifically to them. Allies should have their own agendas. The final challenge should test everything the reader has learned. Include moments of camaraderie and moments of betrayal. The world should feel like it exists beyond the edges of the story.`,
  diplomacy: `DIPLOMACY/INTRIGUE RULES: Every character has a secret. Every alliance is conditional. Words are weapons — the right phrase unlocks doors, the wrong one starts wars. Include at least one scene where the reader has to choose between two allies who can't both get what they want. Power dynamics should shift with every choice. Information is the most valuable currency.`,
};

// Story DNA — premise sparks per genre×theme to prevent sameness
const CYOA_STORY_DNA: Record<string, string[]> = {
  'exploration+horror': [
    'A cartographer\'s map shows a building that doesn\'t exist — until you walk to where it should be, and the door opens for you alone',
    'You inherit a house from a relative you\'ve never met. The house is bigger on the inside. MUCH bigger. And it\'s been waiting.',
    'A cave system that rearranges itself when you\'re not looking — your chalk marks keep appearing on walls you haven\'t visited yet',
    'The museum closes at midnight. You\'re still inside. The exhibits are rearranging themselves into a message meant for you.',
  ],
  'exploration+fantasy': [
    'A library where every book is a door to the world it describes — but the librarian warns you that some books don\'t let you leave',
    'A forest that grows a new path whenever you make a decision — the trees are reading your mind and TESTING you',
    'You find a compass that doesn\'t point north — it points toward the thing you need most, which keeps changing',
    'A city exists in the space between raindrops — you can only see it during storms, and each visit the city remembers you better',
  ],
  'exploration+scifi': [
    'A derelict space station where the AI is still running but has become something that thinks it\'s God — and has proof',
    'You find a device that lets you see 30 seconds into the future — but the future keeps showing you things you don\'t want to do',
    'A planet where the terrain responds to human emotion — your fear literally creates monsters, your joy creates gardens',
  ],
  'exploration+mystery': [
    'You\'re trapped in a town that doesn\'t appear on any map — the residents insist you\'ve always lived there',
    'Every door in an old hotel leads to a different year — guests from different decades are solving the same murder',
  ],
  'exploration+cozy': [
    'A magical market appears in your neighborhood every full moon — each stall sells something impossible, and the vendors remember every customer forever',
    'You find a garden gate that leads to a place where lost things end up — lost socks, lost keys, lost memories, lost people',
  ],
  'exploration+cyberpunk': [
    'A glitch in augmented reality reveals a hidden layer of the city — messages left by someone who disappeared, leading somewhere the corps don\'t want you to go',
  ],
  'exploration+steampunk': [
    'An automaton postman delivers a package that should have arrived 100 years ago — inside is a key to a door that only exists when the clock tower strikes 13',
  ],
  'exploration+postapoc': [
    'A radio signal from a city that was supposedly destroyed — you follow it through the wasteland and find something impossible: civilization, thriving, hidden',
  ],
  'survival+horror': [
    'A blizzard traps you in a cabin with four strangers — one of them isn\'t human, and the storm won\'t let anyone leave until it\'s fed',
    'You wake up on a life raft in fog so thick you can\'t see the water — something is circling, and it keeps calling your name',
    'A wildfire traps you in an underground bunker with supplies for one person. There are three of you. And the fire talks.',
  ],
  'survival+fantasy': [
    'You\'re the last person on a flying island and it\'s sinking — every choice about what to save determines where it lands and what survives',
    'A magical winter that freezes not just water but TIME — you have to navigate a world where different zones are stuck in different moments',
  ],
  'survival+scifi': [
    'Your space suit has 6 hours of oxygen. The rescue ship arrives in 8. The abandoned station between you and safety has air — but it also has a reason it was abandoned.',
    'A colony ship\'s AI wakes you 200 years early. Something is wrong with the other sleepers. You\'re alone with 4,000 dreamers and a computer that\'s lying.',
  ],
  'survival+postapoc': [
    'The last clean water source is guarded by a community that will trade — but what they want in return gets darker with each visit',
    'A caravan crosses the waste. Each night brings a choice: who eats, who keeps watch, who gets left behind when the thing in the dust comes.',
  ],
  'investigation+mystery': [
    'A detective finds their own cold case file — their murder, dated next week, with evidence they haven\'t planted yet',
    'A true crime podcast host gets a call from a listener who says they know where the body is — because they put it there, and they want to stop',
    'Every witness to a crime gives you a completely different story — and physical evidence supports ALL of them simultaneously',
  ],
  'investigation+horror': [
    'A forensic photographer notices something in their crime scene photos that wasn\'t there when they took them — and it\'s getting closer in each frame',
    'A missing persons case leads to a door in the basement of city hall that opens onto a staircase going down for miles — and someone is climbing up',
  ],
  'investigation+scifi': [
    'A murder on a space station where everyone has an alibi because the station\'s AI provides time-stamped footage — except the AI has opinions about who SHOULD have died',
  ],
  'heist_escape+horror': [
    'You\'re breaking into a vault that\'s also a prison — the thing inside has been paying people to rob the vault because it WANTS to be stolen',
    'An escape room that won\'t let you leave. The puzzles get more personal. The game master knows things about you that no one should.',
  ],
  'heist_escape+scifi': [
    'You\'re stealing a memory from someone\'s brain while they sleep — but their subconscious is a security system and it knows you\'re there',
    'Breaking out of a time loop requires stealing an object from every iteration — but each loop the guards remember a little more',
  ],
  'heist_escape+fantasy': [
    'You\'re stealing a dragon\'s name — the most valuable thing in the kingdom, protected by the dragon itself, who finds the whole heist amusing',
  ],
  'quest+fantasy': [
    'The quest object is a weapon that WANTS to be found — every shortcut it offers makes the journey easier but the wielder worse',
    'You\'re searching for a hero who went on this quest 20 years ago and never came back — and every town you visit tells a different story about what they became',
  ],
  'quest+horror': [
    'You\'re delivering a sealed message to the edge of the world — and the thing following you is the answer to what\'s inside',
  ],
  'quest+scifi': [
    'A distress signal from a planet that humanity abandoned leads to a discovery: we didn\'t abandon it. We were REMOVED.',
  ],
  'diplomacy+fantasy': [
    'You\'re the ambassador to a kingdom that doesn\'t believe humans exist — convincing them means navigating a court built entirely on a different species\' idea of truth',
  ],
  'diplomacy+scifi': [
    'First contact, but the alien delegation keeps asking to speak to "the real leader" — and they\'re not talking about the president',
  ],
  'diplomacy+mystery': [
    'A peace summit where one delegate will be assassinated before dawn — you don\'t know who the target is, who the assassin is, or which side hired them',
  ],
};

function getCYOAStoryDNA(genreId: string, themeId: string): string {
  const specific = CYOA_STORY_DNA[`${genreId}+${themeId}`];
  if (specific?.length) return randomPick(specific);
  // Fall back to any entry that starts with the genre
  const genreKeys = Object.keys(CYOA_STORY_DNA).filter(k => k.startsWith(genreId + '+'));
  if (genreKeys.length) {
    const pool = genreKeys.flatMap(k => CYOA_STORY_DNA[k]);
    return randomPick(pool);
  }
  return '';
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

  // Creative variety seeds
  const narrativeHook = randomPick(CYOA_NARRATIVE_HOOKS);
  const sceneDynamic1 = randomPick(CYOA_SCENE_DYNAMICS);
  const sceneDynamic2 = randomPick(CYOA_SCENE_DYNAMICS.filter(s => s !== sceneDynamic1));
  const antiFormulas = randomPicks(CYOA_ANTI_FORMULA, 3);
  const genreGuide = cyoaGenreGuide[genre] || '';
  const storyDNA = getCYOAStoryDNA(genre, config.theme.id);

  onProgress?.('Asking Gemini to design the story outline');

  const prompt = `You are a master Choose Your Own Adventure author — the kind whose books get passed around until the covers fall off, with readers arguing about which path is "the best one." You write like the love child of Joe Dever, Steve Jackson, and whoever wrote the creepiest Goosebumps. Creativity seed: ${Date.now()}.

IMPORTANT: You've written hundreds of CYOA books. You're BORED of the obvious story. The first idea? Skip it. The second? Also skip it. Go to the THIRD idea — the one that's weird, specific, and makes you want to read your own book.

Create a complete story OUTLINE for a CYOA book with exactly ${pageCount} pages.
Adventure type: ${config.cyoaGenre.name}
Theme/atmosphere: ${themeName} — THIS MUST DRIP FROM EVERY PAGE. The reader should feel immersed in ${themeName} from the first paragraph to the last.
Deadliness: ${deadliness} — ${deadlinessDesc[deadliness] || 'moderate'}
${seedLine}

═══ CREATIVE SPARKS (use as inspiration, don't copy literally) ═══
Narrative hook: "${narrativeHook}"
Scene moments to weave in: "${sceneDynamic1}" and "${sceneDynamic2}"
${storyDNA ? `\n═══ STORY DNA (a premise spark — riff on it, remix it, twist it) ═══\n"${storyDNA}"\nDon't use this literally. It's a creative SEED. Mutate it, make it yours.` : ''}

═══ QUALITY BAR ═══
${antiFormulas.join('\n')}
${genreGuide}
- Every choice should make the reader PAUSE and think. No obvious "right answer" choices.
- The premise should grab the reader in ONE sentence. If it takes two paragraphs to get interesting, start later.
- Characters the reader meets should have PERSONALITY — not just "a guard" but "a guard who collects butterflies and speaks in riddles."
- At least one path should have a genuine twist that recontextualizes the story.
- Dead ends should still be satisfying reads — a great death scene is better than a boring safe page.

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
- Page "1" is always the opening — and it should GRAB the reader immediately
- Every non-ending page must have 2-3 choices that feel genuinely different (not "go left" vs "go right")
- Ending pages have empty choices array and is_ending=true
- ending_type is "good", "bad", or "neutral"
- At least 2 good endings, at least 1 neutral
- ALL pages must be reachable from page 1 (no orphan pages)
- Create a branching tree, NOT a linear path — different paths should feel like different stories
- Include 3-5 key items that gate certain paths (add "item_required": "item_name" to gated choices)
- Items should be INTERESTING discoveries, not just keys to locks
- Target ~${numEndings} ending pages
- Each choice's "text" should create tension or curiosity — the reader should WANT to know what happens

Output ONLY the JSON.`;

  const result = await askGemini(prompt, 1.0, true);
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
    onProgress?.(`Writing prose chunk ${chunkNum}/${totalChunks} (${chunk.length} pages)`);

    const prompt = `You are writing prose for a Choose Your Own Adventure book. Your prose should make readers forget they're reading — they should feel like they're THERE.

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
- Vivid sensory details — what you SEE, HEAR, SMELL, FEEL. Make it cinematic.
- The ${context.theme} atmosphere should be palpable in every paragraph — word choices, imagery, mood
- Build tension and atmosphere — the reader should feel their pulse quicken
- Dialogue should sound like real people talking, not exposition delivery
- For endings: good = triumphant catharsis, bad = haunting and memorable, neutral = bittersweet and thoughtful
- 2-4 sentences per paragraph
- Don't mention page numbers in the prose
- NEVER refer to the protagonist in third person — the reader IS the protagonist
- Vary sentence length — short punchy sentences for action, longer flowing ones for atmosphere

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
  onProgress?.('Checking graph integrity');
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
  onProgress?.('Verifying item gates');
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

  // Descriptive rotating messages for Phase 1 — each fires every ~3s while Gemini thinks
  const CONCEPT_HEARTBEATS = [
    `📖 Inventing a ${config.cyoaGenre.name} premise that grabs you on page one`,
    `🌿 Mapping ${config.structure.pageCount} pages of branching choices`,
    `🎭 Giving the characters secrets worth discovering`,
    `🗝️ Designing items that feel like real discoveries, not just keys`,
    `⚖️ Balancing good endings vs. deadly dead-ends (${config.structure.deadliness} deadliness)`,
    `🌐 Weaving the choice tree so every path feels different`,
    `✍️ Crafting the opening hook — the line that makes you lean in`,
    `🧩 Placing item gates on paths that make sense to earn`,
    `💀 Writing bad endings that are haunting, not just "you die"`,
    `🎲 Seeding the ${config.theme.name} atmosphere through every branch`,
    `🏁 Counting endings — good, bad, and the ones that make you think`,
    `🔍 Double-checking every page is reachable from page one`,
  ];
  let heartbeatIdx = 0;

  // Phase 1: Concept — with heartbeat so progress doesn't freeze
  sendProgress(5, `📖 Planning a ${config.cyoaGenre.name} adventure — ${config.structure.pageCount} pages, ${config.structure.deadliness} deadliness`, 'concept');
  let conceptPct = 5;
  const conceptHeartbeat = setInterval(() => {
    conceptPct = Math.min(conceptPct + 1, 14);
    const msg = CONCEPT_HEARTBEATS[heartbeatIdx % CONCEPT_HEARTBEATS.length];
    heartbeatIdx++;
    sendProgress(conceptPct, msg, 'outline');
  }, 3000);
  const concept = await phaseConcept(config, (msg) => sendProgress(10, msg, 'outline'));
  clearInterval(conceptHeartbeat);
  if (!concept) {
    sendProgress(0, 'Failed to generate concept — Gemini did not return valid JSON');
    return null;
  }

  const elapsed1 = Math.floor((Date.now() - t0) / 1000);
  const goodEndings = concept.page_map.filter(p => p.is_ending && p.ending_type === 'good').length;
  const badEndings = concept.page_map.filter(p => p.is_ending && p.ending_type === 'bad').length;
  sendProgress(15, `✅ Outline ready (${elapsed1}s) — "${concept.title}": ${concept.page_map.length} pages, ${concept.characters.length} characters, ${goodEndings} good / ${badEndings} bad endings`, 'outline');

  // Phase 2: Prose — smooth progress across chunks
  const totalChunks = Math.ceil(concept.page_map.length / 5);
  let chunksDone = 0;
  sendProgress(18, `✍️ Writing vivid second-person prose for ${concept.page_map.length} pages (${totalChunks} batches)`, 'prose');
  const prose = await phaseProse(concept, config, (msg) => {
    // Track chunk completion from the message
    const chunkMatch = msg.match(/chunk (\d+)\/(\d+)/);
    if (chunkMatch) {
      chunksDone = parseInt(chunkMatch[1]) - 1;
      const done = parseInt(chunkMatch[1]);
      const total = parseInt(chunkMatch[2]);
      const startPage = (done - 1) * 5 + 1;
      const endPage = Math.min(done * 5, concept.page_map.length);
      const descriptive = `✍️ Writing pages ${startPage}–${endPage} of ${concept.page_map.length} — laying down the ${config.theme.name} atmosphere`;
      const proseProgress = 18 + Math.floor((chunksDone / totalChunks) * 32);
      const stageId = proseProgress < 30 ? 'prose' : proseProgress < 42 ? 'prose_mid' : 'prose_final';
      sendProgress(Math.min(proseProgress, 50), descriptive, stageId);
    } else {
      const proseProgress = 18 + Math.floor((chunksDone / totalChunks) * 32);
      const stageId = proseProgress < 30 ? 'prose' : proseProgress < 42 ? 'prose_mid' : 'prose_final';
      sendProgress(Math.min(proseProgress, 50), msg, stageId);
    }
  });
  const elapsed2 = Math.floor((Date.now() - t0) / 1000);
  sendProgress(50, `✅ All ${Object.keys(prose).length} pages written (${elapsed2}s) — "${concept.title}" has its voice`, 'prose_final');

  // Phase 3: Assembly
  sendProgress(55, `🔗 Stitching the ${concept.page_map.length}-page choice graph together`, 'assembly');
  const story = assembleStory(concept, prose, config);
  const endings = Object.values(story.pages).filter(p => p.isEnding).length;
  const goodEndCount = Object.values(story.pages).filter(p => p.isEnding && p.endingType === 'good').length;
  const badEndCount  = Object.values(story.pages).filter(p => p.isEnding && p.endingType === 'bad').length;
  sendProgress(60, `✅ Graph assembled — ${story.totalPages} pages, ${endings} endings (${goodEndCount} good, ${badEndCount} bad, ${endings - goodEndCount - badEndCount} neutral)`, 'assembly');

  // Phase 4: Imagen illustrations for key pages
  sendProgress(62, `🎨 Sending ${story.totalPages + 1} illustration requests to Imagen`, 'illustrations');
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
  sendProgress(63, `🖼️ Painting the cover for "${concept.title}"`, 'illustrations');
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
    const isEnding = pageEntry?.is_ending;
    const endingLabel = isEnding ? ` (${pageEntry?.ending_type ?? 'neutral'} ending)` : '';
    sendProgress(pct, `🖼️ Illustrating page ${pid}/${toIllustrate.length}${endingLabel}: ${setting.substring(0, 50)}`, 'illustrations');

    const prompt = `${artPrefix} interior book illustration, scene: ${setting}, ${summary}, ${themeStr}, atmospheric scenery, ${ANTI_IMG_TEXT}`;
    const img = await generateImage(prompt, '4:3');
    if (img) {
      page.illustration = `data:image/png;base64,${img}`;
      page.illustrationCaption = setting;
      imgSuccess++;
    }
  }
  sendProgress(88, `✅ Illustrations done — ${imgSuccess} of ${totalImages} painted`, 'illustrations');

  // Phase 5: QA & auto-fix
  sendProgress(89, '🔍 Tracing every path from page 1 — checking for orphan pages and broken links', 'qa_graph');
  const fixedStory = await phaseQA(story, concept, (msg) => {
    if (msg.includes('item gates')) {
      sendProgress(93, `🔑 ${msg} — removing gates the player can never earn`, 'qa_items');
    } else {
      sendProgress(91, `🔍 ${msg}`, 'qa_graph');
    }
  });

  const endingPages = Object.values(fixedStory.pages).filter(p => p.isEnding);
  sendProgress(95, `✅ QA passed — ${endingPages.filter(p => p.endingType === 'good').length} good endings confirmed reachable`, 'qa_endings');
  sendProgress(96, '📱 Compiling the interactive book viewer', 'viewer');

  const elapsed = Math.floor((Date.now() - t0) / 1000);
  sendProgress(98, `🎉 "${fixedStory.title}" is ready — ${fixedStory.totalPages} pages forged in ${elapsed}s`, 'complete');

  return { story: fixedStory, concept };
}
